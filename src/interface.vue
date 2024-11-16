<template>
  <div v-if="previewEdit">
    <iframe :src="src" @load="handleIframeLoad" :width="widthIframe ?? '100%'" :height="heightIframe"
      title="view"></iframe>
  </div>
  <span class="preview-container">
    <p class="preview-ext" @click.stop="previewDrawerActive = true">Preview</p>
    <a :href="src" target="_blank" rel="noopener noreferrer">
      <v-icon v-tooltip="'Open in new tab'" name="open_in_new" class="preview-icon small" />
    </a>
  </span>

  <v-dialog v-if="src" v-model="previewDrawerActive" @esc="previewDrawerActive = false">

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

      <iframe class="doc" :src="src" @load="handleIframeLoad" ref="iframe" title="view"></iframe>
    </div>

  </v-dialog>

</template>

<script lang="ts">
import { defineComponent, computed, watch, ref } from "vue";

export default defineComponent({
  props: {
    url: {
      type: String,
      default: "",
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
  },
  setup(props) {
    const loading = ref(true);
    const previewDrawerActive = ref(false);
    const url = props.url;
    const widthIframe = computed(() => props.widthiframe);
    const heightIframe = computed(() => props.heightiframe);
    const previewEdit = computed(() => props.viewiframe);
    watch(previewDrawerActive, (newVal) => {
      console.log("Dialog Active:", newVal);
    });
    return {
      previewDrawerActive,
      src: url,
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
        iframe.src = iframe.src; // Reload the iframe
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
  box-shadow:
    -24px 0 #fff,
    24px 0 #fff;
  box-sizing: border-box;
  animation: shadowPulse 2s linear infinite;
}

@keyframes shadowPulse {
  33% {
    background: #fff;
    box-shadow:
      -24px 0 var(--project-color),
      24px 0 #fff;
  }

  66% {
    background: var(--project-color);
    box-shadow:
      -24px 0 #fff,
      24px 0 #fff;
  }

  100% {
    background: #fff;
    box-shadow:
      -24px 0 #fff,
      24px 0 var(--project-color);
  }
}
</style>
