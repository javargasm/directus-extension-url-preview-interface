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
import { defineComponent, computed, watch, ref, inject, ComputedRef, toRefs } from "vue";
import { useCollection, useStores } from '@directus/extensions-sdk';

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

    // Obtener valores inyectados del contexto de Directus
    const values = inject<ComputedRef<Record<string, any>>>('values', computed(() => ({})));

    // Obtener información de la colección
    const { defaults } = useCollection(props.collection);

    // Obtener el store de usuarios para acceder al token
    const { useUserStore } = useStores();
    const userStore = useUserStore();

    if (props.viewDebug) {
      console.log("Initial Props:", JSON.stringify(props, null, 2));
      console.log("Injected Values:", values.value);
    }

    // Obtener el token del store de usuario
    const userToken = computed(() => {
      // Intenta obtener el token del store
      const token = userStore?.currentUser?.token || userStore?.accessToken;

      if (!token) {
        // Fallback: intentar obtener de localStorage
        const localToken = localStorage.getItem('directus_token') ||
          localStorage.getItem('auth_token');
        if (localToken) return localToken;

        // Último fallback: cookies
        return getTokenFromCookie();
      }

      return token;
    });

    // Función fallback para obtener token de cookies
    const getTokenFromCookie = (): string => {
      // Intentar diferentes nombres de cookies comunes de Directus
      const cookieNames = [
        'directus_session_token',
        'directus_refresh_token',
        'auth_token',
        'access_token'
      ];

      const cookies = document.cookie.split(';');

      for (const cookieName of cookieNames) {
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === cookieName && value) {
            if (props.viewDebug) {
              console.log(`Token encontrado en cookie: ${cookieName}`);
            }
            return decodeURIComponent(value);
          }
        }
      }

      if (props.viewDebug) {
        console.warn("No se encontró token en ninguna cookie");
      }
      return '';
    };

    if (props.viewDebug) {
      console.log("User Token:", userToken.value);
    }

    const processedUrl = computed(() => {
      if (!props.url) return "";

      let url = props.url;

      // Reemplazar placeholders con valores inyectados
      const allValues = { ...defaults.value, ...values.value };

      if (props.viewDebug) {
        console.log("All Values:", allValues);
      }

      // Usar regex para encontrar todos los placeholders {{key}}
      url = url.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();

        if (trimmedKey === 'id' && props.primaryKey) {
          return String(props.primaryKey);
        }

        if (trimmedKey === 'token' && userToken.value) {
          return userToken.value;
        }

        // Buscar en los valores inyectados
        const value = allValues[trimmedKey];
        if (value !== undefined && value !== null) {
          return String(value);
        }

        if (props.viewDebug) {
          console.warn(`Placeholder no encontrado: ${trimmedKey}`);
        }

        return match; // Devolver el placeholder original si no se encuentra
      });

      if (props.viewDebug) {
        console.log("Processed URL:", url);
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
            console.log("Final Office URL:", finalUrl);
          }
          return finalUrl;
        }
      }

      return url;
    });

    // Watch para debug
    watch(values, (newValues) => {
      if (props.viewDebug) {
        console.log("Values changed:", newValues);
      }
    }, { deep: true });

    watch(previewDrawerActive, (newVal) => {
      if (props.viewDebug) {
        console.log("Dialog Active:", newVal);
      }
    });

    return {
      previewDrawerActive,
      processedUrl,
      title: "Preview",
      loading,
      previewEdit,
      widthIframe,
      heightIframe,
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
/* Add your styles here if needed */

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
    box-shadow: -24px 0 #fff,
    24px 0 #fff;
    box-sizing: border-box;
    animation: shadowPulse 2s linear infinite;
  }

  @keyframes shadowPulse {
    33% {
      background: #fff;
      box-shadow: -24px 0 var(--project-color),
      24px 0 #fff;
    }

    66% {
      background: var(--project-color);
      box-shadow: -24px 0 #fff,
      24px 0 #fff;
    }

    100% {
      background: #fff;
      box-shadow: -24px 0 #fff,
      24px 0 var(--project-color);
    }
  }</style>