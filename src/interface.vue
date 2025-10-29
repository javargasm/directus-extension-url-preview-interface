<template>
  <div v-if="previewEdit">
    <iframe :src="processedUrl" @load="handleIframeLoad" :width="widthIframe ?? '100%'" :height="heightIframe"
      title="view"></iframe>
  </div>
  <span class="preview-container">
    <p class="preview-ext" @click.stop="previewDrawerActive = true">Preview</p>
    <a :href="processedUrl" target="_blank" rel="noopener noreferrer">
      <v-icon v-tooltip="'Open in new tab'" name="open_in_new" class="preview-icon small" />
    </a>
  </span>

  <v-dialog v-if="processedUrl" v-model="previewDrawerActive" @esc="previewDrawerActive = false">
    <div class="content-iframe">
      <span v-if="loading" class="loader"></span>
      <div v-if="!loading" class="content-center">
        <v-button class="cancel" v-tooltip.bottom="'Refresh'" icon rounded primary @click.stop="refreshIframe()">
          <v-icon name="refresh" />
        </v-button>
        <v-button class="close-button" v-tooltip.bottom="'Close'" icon rounded
          @click.stop="previewDrawerActive = false">
          <v-icon name="close" />
        </v-button>
      </div>
      <iframe class="doc" :src="processedUrl" @load="handleIframeLoad" ref="iframe" title="view"></iframe>
    </div>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, computed, ref, inject, ComputedRef, toRefs, onMounted } from "vue";
import { useApi, useStores } from '@directus/extensions-sdk';
import { useCollection } from '@directus/extensions-sdk';
import { useDeepValues, useCollectionRelations } from './utils';

export default defineComponent({
  props: {
    url: {
      type: String,
      default: "",
    },
    collection: {
      type: String,
      required: true,
    },
    field: {
      type: String,
      default: null,
    },
    widthiframe: {
      type: String,
      default: undefined,
    },
    heightiframe: {
      type: String,
      default: "600px",
    },
    viewiframe: {
      type: Boolean,
      default: false,
    },
    primaryKey: {
      type: [String, Number],
      default: null,
    },
    viewDebug: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const loading = ref(true);
    const previewDrawerActive = ref(false);
    const widthIframe = computed(() => props.widthiframe);
    const heightIframe = computed(() => props.heightiframe);
    const previewEdit = computed(() => props.viewiframe);

    // API y stores
    const api = useApi();
    const { useUserStore } = useStores();
    const userStore = useUserStore();

    // Valores inyectados y relaciones
    const injectedValues = inject<ComputedRef<Record<string, any>>>('values');
    const relations = useCollectionRelations(props.collection);
    const { collection, field, primaryKey } = toRefs(props);
    const defaultValues = useCollection(props.collection).defaults;

    const values = injectedValues ? useDeepValues(
      injectedValues,
      relations,
      collection,
      field,
      primaryKey,
      props.url
    ) : ref({});

    // ✅ Token obtenido del endpoint personalizado
    const sessionToken = ref('');
    const tokenLoading = ref(true);

    // Función para obtener el token desde el endpoint
    const fetchSessionToken = async () => {
      try {
        if (props.viewDebug) {
          console.log("🔄 Fetching session token from endpoint...");
        }

        // Llamar al endpoint personalizado que lee la cookie httpOnly
        const response = await api.get('/session-token');

        sessionToken.value = response.data.token;
        tokenLoading.value = false;

        if (props.viewDebug) {
          console.log("✅ Session token obtained successfully");
          console.log("Token length:", sessionToken.value?.length);
          console.log("Token preview:", sessionToken.value?.substring(0, 30) + '...');
          console.log("Token expires:", response.data.expires);
        }
      } catch (error) {
        console.error("❌ Error fetching session token:", error);
        tokenLoading.value = false;

        if (props.viewDebug) {
          console.error("Error details:", error);
        }
      }
    };

    // Obtener el token al montar el componente
    onMounted(() => {
      fetchSessionToken();
    });

    const processedUrl = computed(() => {
      if (!props.url) return "";
      if (tokenLoading.value) return ""; // Esperar a que el token se cargue

      let url = props.url;
      const allValues = { ...defaultValues.value, ...values.value };

      if (props.viewDebug) {
        console.log("🔍 Processing URL");
        console.log("All Values:", allValues);
        console.log("Session Token available:", !!sessionToken.value);
      }

      // Reemplazar todos los placeholders {{key}}
      url = url.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();

        if (trimmedKey === 'id') {
          return String(props.primaryKey || allValues.id || '');
        }

        // ✅ Reemplazar token con el session token
        if (trimmedKey === 'token' || trimmedKey === 'access_token') {
          return sessionToken.value || '';
        }

        // Soportar paths anidados (ej: user.name)
        if (trimmedKey.includes('.')) {
          const parts = trimmedKey.split('.');
          let value = allValues;

          for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
              value = value[part];
            } else {
              if (props.viewDebug) {
                console.warn(`⚠️ Path not found: ${trimmedKey}`);
              }
              return '';
            }
          }

          return value !== undefined && value !== null ? String(value) : '';
        }

        // Buscar valor directo
        const value = allValues[trimmedKey];
        if (value !== undefined && value !== null) {
          return String(value);
        }

        if (props.viewDebug) {
          console.warn(`⚠️ Placeholder not found: ${trimmedKey}`);
        }

        return '';
      });

      if (props.viewDebug) {
        console.log("📝 Processed URL:", url);
      }

      // Verificar si es un archivo de Office
      const filenameDisk = allValues?.filename_disk;

      if (filenameDisk && typeof filenameDisk === 'string') {
        const lowerFilename = filenameDisk.toLowerCase();
        const officeExtensions = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt'];
        const isOfficeFile = officeExtensions.some(ext => lowerFilename.endsWith(ext));

        if (isOfficeFile) {
          const encodedUrl = encodeURIComponent(url);
          const finalUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

          if (props.viewDebug) {
            console.log("📄 Office file detected");
            console.log("Final Office URL:", finalUrl);
          }

          return finalUrl;
        }
      }

      return url;
    });

    return {
      previewDrawerActive,
      processedUrl,
      title: "Preview",
      loading,
      previewEdit,
      widthIframe,
      heightIframe,
      sessionToken, // Para debug
      tokenLoading,
    };
  },

  methods: {
    refreshIframe() {
      const iframe = this.$refs.iframe as HTMLIFrameElement;
      if (iframe) {
        this.loading = true;
        iframe.src = iframe.src;
      }
    },
    handleIframeLoad() {
      this.loading = false;
    },
  },
});
</script>

<style scoped>

.content-iframe {
  width: 100%;
  padding: 20px;
  margin-top: 50px;
}

.content-center {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 10px;
}

.preview-container {
  display: flex;
  gap: 4px;
  align-items: center;
}

.preview-ext {
  color: var(--project-color);
  cursor: pointer;
}

.preview-icon {
  --v-icon-color: var(--theme--form--field--input--foreground-subdued);

  &:hover {
    --v-icon-color: var(--theme--form--field--input--foreground);
  }
}

.doc {
  width: 100%;
  height: 100vh;
}

.loader {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: block;
  margin: 15px auto;
  position: relative;
  background: #fff;
  box-shadow: -24px 0 #fff, 24px 0 #fff;
  box-sizing: border-box;
  animation: shadowPulse 2s linear infinite;
}

@keyframes shadowPulse {
  33% {
    background: #fff;
    box-shadow: -24px 0 var(--project-color), 24px 0 #fff;
  }

  66% {
    background: var(--project-color);
    box-shadow: -24px 0 #fff, 24px 0 #fff;
  }

  100% {
    background: #fff;
    box-shadow: -24px 0 #fff, 24px 0 var(--project-color);
  }
}
</style>
