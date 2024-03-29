import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import includeFields from "vue-fields/src/main";
import includeButtons from "vue-buttons/src/main";
import includeCards from "vue-cards/src/main";
import router from "./router";

const app = createApp(App);
app.use(router);

const pinia = createPinia();
app.use(pinia);

includeFields(app);
includeButtons(app);
includeCards(app);

app.mount("#app");
