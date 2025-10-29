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
import { defineComponent, computed, ref, inject, ComputedRef, toRefs } from "vue";
import { useCollection, useStores } from '@directus/extensions-sdk';
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

    // Obtener valores por defecto de la colección
    const defaultValues = useCollection(props.collection).defaults;

    // Obtener las relaciones de la colección
    const relations = useCollectionRelations(props.collection);

    // Convertir props a refs para pasarlas a useDeepValues
    const { collection, field, primaryKey } = toRefs(props);

    // Obtener valores inyectados del contexto de Directus
    const injectedValues = inject<ComputedRef<Record<string, any>>>('values');

    // Usar useDeepValues para obtener todos los valores incluyendo relaciones
    const values = injectedValues ? useDeepValues(
      injectedValues,
      relations,
      collection,
      field,
      primaryKey,
      props.url // usar url como template
    ) : ref({});

    // Obtener el store de usuarios
    const { useUserStore } = useStores();
    const userStore = useUserStore();

    if (props.viewDebug) {
      console.log("Initial Props:", JSON.stringify(props, null, 2));
      console.log("Default Values:", defaultValues.value);
      console.log("Relations:", relations.value);
    }

    // Obtener el token del usuario actual
    const userToken = computed(() => {
      const currentUser = (values.value as Record<string, any>)?.__currentUser || userStore?.currentUser;

      if (props.viewDebug) {
        console.log("Current User:", currentUser);
      }

      // Intentar obtener el token del usuario actual
      return currentUser?.token || '';
    });

    const processedUrl = computed(() => {
      if (!props.url) return "";

      let url = props.url;
      const allValues: Record<string, any> = { ...defaultValues.value, ...values.value };

      if (props.viewDebug) {
        console.log("All Values:", allValues);
        console.log("User Token:", userToken.value);
      }

      // Reemplazar todos los placeholders {{key}}
      url = url.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();

        // Casos especiales
        if (trimmedKey === 'id') {
          return String(props.primaryKey || allValues.id || '');
        }

        if (trimmedKey === 'token') {
          return userToken.value || '';
        }

        // Buscar en valores usando path (ej: user.name)
        if (trimmedKey.includes('.')) {
          const parts = trimmedKey.split('.');
          let value = allValues;

          for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
              value = (value as Record<string, any>)[part];
            } else {
              if (props.viewDebug) {
                console.warn(`Path not found: ${trimmedKey}`);
              }
              return match;
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
          console.warn(`Placeholder not found: ${trimmedKey}`);
        }

        return match;
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

        if (props.viewDebug) {
          console.log("Filename Disk:", filenameDisk);
          console.log("Is Office File:", isOfficeFile);
        }

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
