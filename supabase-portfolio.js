/* =========================================================================
   CACA PORTFOLIO — SUPABASE CLOUD DATA, AUTHENTICATION & STORAGE
   The browser uses only the Supabase publishable/anon key.
   Database access is protected by Row Level Security (RLS).
   ========================================================================= */
(function () {
  'use strict';

  const state = () => window.StateStore;
  const storage = () => window.StorageService;
  const bucketName = () => window.CACA_SUPABASE_CONFIG?.storageBucket || 'portfolio-assets';

  const SupabaseService = {
    client: null,
    configured: false,
    isAdmin: false,
    sessionEmail: '',
    cloudInitialized: false,
    initPromise: null,
    saveTimer: null,
    saving: null,
    saveAgain: false,
    uploadCache: new Map(),
    lastSyncError: null,

    async initialize() {
      if (this.initPromise) return this.initPromise;

      this.initPromise = (async () => {
        const config = window.CACA_SUPABASE_CONFIG || {};
        const url = String(config.url || '').trim();
        const anonKey = String(config.anonKey || '').trim();

        if (!url || !anonKey || /YOUR[-_ ]|PASTE[-_ ]/i.test(url + ' ' + anonKey)) {
          console.info('Supabase belum dikonfigurasi. Website memakai data bawaan/cache lokal.');
          this.configured = false;
          return false;
        }

        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
          console.error('Supabase JS SDK tidak berhasil dimuat.');
          return false;
        }

        this.client = window.supabase.createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        this.configured = true;
        this.client.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            this.isAdmin = false;
            this.sessionEmail = '';
          } else if (session?.user?.email) {
            this.sessionEmail = session.user.email;
          }
        });

        try {
          const { data, error } = await this.client.auth.getSession();
          if (error) throw error;
          const session = data?.session;
          if (session) {
            this.sessionEmail = session.user?.email || '';
            try {
              await this.verifyAdmin();
            } catch (adminError) {
              console.warn('Verifikasi administrator belum tersedia:', adminError);
              this.isAdmin = false;
            }
          }

          try {
            await this.loadCloudState();
          } catch (loadError) {
            this.lastSyncError = loadError;
            console.error('Gagal memuat data portofolio dari Supabase:', loadError);
          }

          // Jika database belum pernah diisi dari CMS, akun admin pertama
          // dapat mengirim data lokal/default yang sudah ada ke cloud.
          if (this.isAdmin && !this.cloudInitialized) {
            try {
              await this.persistState();
            } catch (migrationError) {
              this.lastSyncError = migrationError;
              console.error('Migrasi awal data portofolio ke Supabase gagal:', migrationError);
            }
          }
          return true;
        } catch (error) {
          this.lastSyncError = error;
          console.error('Inisialisasi Supabase gagal:', error);
          return false;
        }
      })();

      return this.initPromise;
    },

async verifyAdmin() {
  if (!this.client) return false;

  const { data, error } = await this.client.rpc('is_current_user_admin');

  if (error) {
    this.isAdmin = false;
    throw error;
  }

  this.isAdmin = data === true;
  return this.isAdmin;
},

async signIn(email, password) {
  await this.initialize();

  if (!this.client || !this.configured) {
    throw new Error('Supabase belum terhubung.');
  }

  const { data, error } = await this.client.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  this.sessionEmail = data.user.email;

  try {
    const allowed = await this.verifyAdmin();

    if (!allowed) {
      throw new Error('Akun ini belum terdaftar sebagai administrator.');
    }

    await this.loadCloudState();

    if (!this.cloudInitialized) {
      await this.persistState();
    }

    return true;

  } catch (error) {
    await this.client.auth.signOut();
    this.isAdmin = false;
    this.sessionEmail = '';
    throw error;
  }
},

async signOut() {
  if (!this.client) return;

  const { error } = await this.client.auth.signOut();

  if (error) throw error;

  this.isAdmin = false;
  this.sessionEmail = '';
},
    async loadCloudState() {
      if (!this.client) return false;

      const [profileResult, experienceResult, projectResult, volunteerResult, skillResult] =
        await Promise.all([
          this.client.from('profiles').select('*').eq('id', 1).maybeSingle(),
          this.client.from('experiences').select('*').order('sort_order', { ascending: true }),
          this.client.from('projects').select('*').order('sort_order', { ascending: true }),
          this.client.from('volunteer_experiences').select('*').order('sort_order', { ascending: true }),
          this.client.from('skills').select('*').order('sort_order', { ascending: true })
        ]);

      for (const result of [profileResult, experienceResult, projectResult, volunteerResult, skillResult]) {
        if (result.error) throw result.error;
      }

      const portfolioState = state();
      const profileRow = profileResult.data;
      const extra = profileRow?.extra_data && typeof profileRow.extra_data === 'object'
        ? profileRow.extra_data
        : {};

      this.cloudInitialized = extra.cms_initialized === true;

      if (profileRow && this.cloudInitialized) {
        if (extra.profile && typeof extra.profile === 'object') {
          portfolioState.profile = Object.assign({}, portfolioState.profile, extra.profile);
        }
        if (profileRow.full_name) portfolioState.profile.full_name = profileRow.full_name;
        if (profileRow.headline !== null && profileRow.headline !== undefined) {
          portfolioState.profile.hero_bio = profileRow.headline;
        }
        if (profileRow.bio !== null && profileRow.bio !== undefined) {
          portfolioState.profile.about_content = profileRow.bio;
        }
        if (profileRow.location) portfolioState.profile.location = profileRow.location;
        if (profileRow.email) portfolioState.profile.email = profileRow.email;
        if (profileRow.phone) portfolioState.profile.whatsapp_number = profileRow.phone;
        if (profileRow.photo_url) portfolioState.profile.avatar_url = profileRow.photo_url;

        portfolioState.educations = Array.isArray(extra.educations) ? extra.educations : [];
        portfolioState.social_links = Array.isArray(extra.social_links)
          ? extra.social_links
          : (Array.isArray(profileRow.social_links) ? profileRow.social_links : []);
        portfolioState.cv_documents = Array.isArray(extra.cv_documents) ? extra.cv_documents : [];
      } else if (profileRow && Array.isArray(profileRow.social_links) && profileRow.social_links.length) {
        portfolioState.social_links = profileRow.social_links;
      }

      const experiences = (experienceResult.data || []).map((row) => row.data && Object.keys(row.data).length ? row.data : {
        id: row.legacy_id || row.id,
        role_title: row.position,
        organization: row.company,
        location: row.location,
        type: row.employment_type,
        description: row.description,
        sort_order: row.sort_order
      });

      const projects = (projectResult.data || []).map((row) => row.data && Object.keys(row.data).length ? row.data : {
        id: row.legacy_id || row.id,
        slug: String(row.title || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        title: row.title,
        category: row.category,
        summary: row.description,
        image_url: row.image_url,
        project_url: row.project_url,
        github_url: row.github_url,
        tools_used: row.technologies || [],
        sort_order: row.sort_order
      });

      const volunteers = (volunteerResult.data || []).map((row) => row.data && Object.keys(row.data).length ? row.data : {
        id: row.legacy_id || row.id,
        activity_name: row.organization,
        organization: row.organization,
        role: row.role,
        location: row.location,
        description: row.description,
        image_url: row.image_url,
        photos: row.image_url ? [row.image_url, ''] : ['', ''],
        sort_order: row.sort_order
      });

      const allSkills = (skillResult.data || []).map((row) => {
        const item = row.data && typeof row.data === 'object' && Object.keys(row.data).length ? { ...row.data } : {
          id: row.legacy_id || row.id,
          name: row.name,
          proficiency: row.proficiency,
          sort_order: row.sort_order
        };
        const collection = item.__supabase_collection || (row.category === 'tools' ? 'software_tools' : 'skills');
        delete item.__supabase_collection;
        return { collection, item };
      });

      const cloudSkills = allSkills
        .filter((entry) => entry.collection !== 'software_tools')
        .map((entry) => entry.item);
      const cloudTools = allSkills
        .filter((entry) => entry.collection === 'software_tools')
        .map((entry) => entry.item);

      if (this.cloudInitialized || experiences.length) portfolioState.experiences = experiences;
      if (this.cloudInitialized || projects.length) portfolioState.projects = projects;
      if (this.cloudInitialized || volunteers.length) portfolioState.volunteers = volunteers;
      if (this.cloudInitialized || cloudSkills.length) portfolioState.skills = cloudSkills;

      if (this.cloudInitialized) {
        portfolioState.software_tools = cloudTools.length
          ? cloudTools
          : (Array.isArray(extra.software_tools) ? extra.software_tools : []);
        if (!Array.isArray(extra.educations)) portfolioState.educations = [];
        if (!Array.isArray(extra.social_links)) portfolioState.social_links = [];
        if (!Array.isArray(extra.cv_documents)) portfolioState.cv_documents = [];
      } else if (cloudTools.length) {
        portfolioState.software_tools = cloudTools;
      }

      if (this.isAdmin) {
        const { data: messages, error: messagesError } = await this.client
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (messagesError) {
          console.warn('Pesan kontak belum dapat dimuat:', messagesError);
        } else {
          portfolioState.contact_messages = (messages || []).map((message) => ({
            id: message.id,
            full_name: message.name,
            email: message.email,
            subject: message.subject || '',
            message: message.message,
            status: message.status || 'unread',
            is_read: message.status !== 'unread',
            created_at: message.created_at
          }));
        }
      }

      if (storage()?.saveLocalOnly) storage().saveLocalOnly();
      return true;
    },

    async submitMessage({ name, email, subject, message }) {
      if (!this.client || !this.configured) {
        throw new Error('Koneksi database belum tersedia.');
      }
      const { error } = await this.client.from('messages').insert({
        name: String(name || '').trim(),
        email: String(email || '').trim(),
        subject: String(subject || '').trim(),
        message: String(message || '').trim(),
        status: 'unread'
      });
      if (error) throw error;
      return true;
    },

    scheduleSave() {
      if (!this.configured || !this.isAdmin || !this.client) return;
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        this.persistState().catch((error) => {
          this.lastSyncError = error;
          console.error('Sinkronisasi Supabase gagal:', error);
          if (window.ToastService) {
            window.ToastService.show('Perubahan tersimpan di perangkat, tetapi sinkronisasi cloud gagal. Periksa koneksi dan kebijakan Supabase.', 'error');
          }
        });
      }, 700);
    },

    async uploadDataUrl(dataUrl, folder) {
      if (this.uploadCache.has(dataUrl)) {
        return await this.uploadCache.get(dataUrl);
      }

      const uploadPromise = (async () => {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const mime = blob.type || (dataUrl.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg');
        const extensionMap = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'application/pdf': 'pdf'
        };
        const extension = extensionMap[mime] || 'bin';
        const randomId = (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const objectPath = `${folder}/${randomId}.${extension}`;

        const { error } = await this.client.storage
          .from(bucketName())
          .upload(objectPath, blob, {
            cacheControl: '3600',
            contentType: mime,
            upsert: false
          });
        if (error) throw error;

        const { data } = this.client.storage.from(bucketName()).getPublicUrl(objectPath);
        if (!data?.publicUrl) throw new Error('URL publik file tidak berhasil dibuat.');
        return data.publicUrl;
      })();

      this.uploadCache.set(dataUrl, uploadPromise);
      try {
        const publicUrl = await uploadPromise;
        this.uploadCache.set(dataUrl, publicUrl);
        return publicUrl;
      } catch (error) {
        this.uploadCache.delete(dataUrl);
        throw error;
      }
    },

    async normalizeNode(value, folder) {
      if (typeof value === 'string') {
        if (/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/i.test(value)) {
          return await this.uploadDataUrl(value, folder);
        }
        return value;
      }
      if (Array.isArray(value)) {
        const result = [];
        for (const item of value) result.push(await this.normalizeNode(item, folder));
        return result;
      }
      if (value && typeof value === 'object') {
        const result = {};
        for (const [key, child] of Object.entries(value)) {
          result[key] = await this.normalizeNode(child, folder);
        }
        return result;
      }
      return value;
    },

    async normalizeAssets() {
      const portfolioState = state();
      const folders = [
        ['profile', 'profile'],
        ['educations', 'education'],
        ['skills', 'skills'],
        ['software_tools', 'tools'],
        ['projects', 'projects'],
        ['experiences', 'experiences'],
        ['volunteers', 'volunteers'],
        ['cv_documents', 'cv']
      ];

      for (const [key, folder] of folders) {
        portfolioState[key] = await this.normalizeNode(portfolioState[key], folder);
      }
    },

    async syncRows(tableName, rows) {
      if (rows.length) {
        const { error } = await this.client
          .from(tableName)
          .upsert(rows, { onConflict: 'legacy_id' });
        if (error) throw error;
      }

      const { data: existingRows, error: selectError } = await this.client
        .from(tableName)
        .select('id,legacy_id');
      if (selectError) throw selectError;

      const keep = new Set(rows.map((row) => row.legacy_id));
      const staleIds = (existingRows || [])
        .filter((row) => row.legacy_id && !keep.has(row.legacy_id))
        .map((row) => row.id);

      if (staleIds.length) {
        const { error: deleteError } = await this.client
          .from(tableName)
          .delete()
          .in('id', staleIds);
        if (deleteError) throw deleteError;
      }
    },

    async persistState() {
      if (!this.client || !this.configured || !this.isAdmin) return false;
      if (this.saving) {
        this.saveAgain = true;
        return this.saving;
      }

      this.saving = (async () => {
        do {
          this.saveAgain = false;
          await this.normalizeAssets();

          const portfolioState = state();
          const profile = portfolioState.profile || {};
          const activeCv = (portfolioState.cv_documents || []).find((doc) => doc.is_active)
            || (portfolioState.cv_documents || [])[0];

          const profileRow = {
            id: 1,
            full_name: profile.full_name || 'Caca Crisancta',
            headline: profile.hero_bio || '',
            bio: profile.about_content || '',
            location: profile.location || null,
            email: profile.email || null,
            phone: profile.whatsapp_number || null,
            photo_url: profile.avatar_url || null,
            cv_url: activeCv?.file_url || null,
            social_links: portfolioState.social_links || [],
            extra_data: {
              cms_initialized: true,
              profile,
              educations: portfolioState.educations || [],
              software_tools: portfolioState.software_tools || [],
              social_links: portfolioState.social_links || [],
              cv_documents: portfolioState.cv_documents || []
            },
            updated_at: new Date().toISOString()
          };

          const { error: profileError } = await this.client
            .from('profiles')
            .upsert(profileRow, { onConflict: 'id' });
          if (profileError) throw profileError;

          const experienceRows = (portfolioState.experiences || []).map((item, index) => ({
            legacy_id: String(item.id || `experience-${index + 1}`),
            position: item.role_title || item.position || item.role || 'Experience',
            company: item.organization || item.company || 'Organization',
            location: item.location || null,
            employment_type: item.type || item.employment_type || null,
            description: item.description || (Array.isArray(item.highlights) ? item.highlights.join('\n') : ''),
            image_url: item.image_url || null,
            sort_order: Number(item.sort_order ?? index + 1),
            is_published: item.is_published !== false,
            data: item
          }));

          const projectRows = (portfolioState.projects || []).map((item, index) => ({
            legacy_id: String(item.id || `project-${index + 1}`),
            title: item.title || 'Project',
            category: item.category || null,
            description: item.summary || item.description || item.background || '',
            image_url: item.image_url || item.cover_url || null,
            project_url: item.project_url || null,
            github_url: item.github_url || null,
            technologies: Array.isArray(item.tools_used) ? item.tools_used : [],
            sort_order: Number(item.sort_order ?? index + 1),
            is_published: item.is_published !== false,
            data: item
          }));

          const volunteerRows = (portfolioState.volunteers || []).map((item, index) => ({
            legacy_id: String(item.id || `volunteer-${index + 1}`),
            organization: item.organization || item.activity_name || 'Volunteer Activity',
            role: item.role || null,
            location: item.location || null,
            description: item.description || '',
            image_url: item.image_url || (Array.isArray(item.photos) ? item.photos[0] : null) || null,
            sort_order: Number(item.sort_order ?? index + 1),
            is_published: item.is_published !== false,
            data: item
          }));

          const skillRows = [
            ...(portfolioState.skills || []).map((item, index) => ({
              legacy_id: String(item.id || `skill-${index + 1}`),
              name: item.name || 'Skill',
              category: 'hard_skill',
              proficiency: item.proficiency || null,
              icon_url: item.icon_url || null,
              sort_order: Number(item.sort_order ?? index + 1),
              is_published: item.is_published !== false,
              data: { ...item, __supabase_collection: 'skills' }
            })),
            ...(portfolioState.software_tools || []).map((item, index) => ({
              legacy_id: String(item.id || `tool-${index + 1}`),
              name: item.name || 'Software Tool',
              category: 'tools',
              proficiency: item.proficiency || null,
              icon_url: item.icon_url || null,
              sort_order: Number(item.sort_order ?? index + 1),
              is_published: item.is_published !== false,
              data: { ...item, __supabase_collection: 'software_tools' }
            }))
          ];

          await this.syncRows('experiences', experienceRows);
          await this.syncRows('projects', projectRows);
          await this.syncRows('volunteer_experiences', volunteerRows);
          await this.syncRows('skills', skillRows);

          this.cloudInitialized = true;
          this.lastSyncError = null;
          if (storage()?.saveLocalOnly) storage().saveLocalOnly();
        } while (this.saveAgain);

        return true;
      })();

      try {
        return await this.saving;
      } finally {
        this.saving = null;
      }
    }
  };

  window.SupabaseService = SupabaseService;
})();
