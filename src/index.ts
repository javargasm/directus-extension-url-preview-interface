import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

export default defineInterface({
  id: "url-preview",
  name: "Url Preview",
  icon: "iframe",
  description:
    "A utility to preview URL content and display it in a fullscreen dialog.",
  component: InterfaceComponent,
  types: ["string"],
  group: "presentation",
  options: [
    {
      field: "url",
      name: "URL",
      type: "string",
      meta: {
        width: "full",
        interface: "input",
        note: "Paste your url view here. external url add enviroment e.g.: CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC=docs.google.com",
        options: {
          trim: true,
          placeholder:
            "https://docs.google.com/spreadsheets/d/1ZaVWbudXmgfxsDuCh59PJyPkDyDUlmS_LI1xI5XmgB0/edit",
        },
        required: true,
      },
    },
    {
      field: "viewiframe",
      name: "Preview In Edit",
      type: "boolean",
      meta: {
        width: "full",
        interface: "boolean",
        note: "Show content url in edit or create mode",
      },
      schema: {
        default_value: false,
      },
    },
    {
      field: "widthiframe",
      name: "Width",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        options: {
          trim: true,
          placeholder: "Iframe width in px or %. Default 100%",
        },
        hidden: true,
        conditions: [
          {
            rule: {
              viewiframe: {
                _eq: true,
              },
            },
            hidden: false,
          },
        ],
      },
    },
    {
      field: "heightiframe",
      name: "Height",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        options: {
          trim: true,
          placeholder: "Iframe height in px. Default 600px",
        },
        hidden: true,
        conditions: [
          {
            rule: {
              viewiframe: {
                _eq: true,
              },
            },
            hidden: false,
          },
        ],
      },
    },
  ],
});
