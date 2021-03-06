<template>
  <div class="container">
    <warning
      v-if="warning"
      class="warning-message"
      v-bind="warning"
      @close="quitWarning(index)"
    >
    </warning>
    <div class="card shadowed">
      <banner version="Alpha" :title="bannerTitle" :icon="`logo.${theme}.png`">
      </banner>
      <sign-on
        :title="submitTitle"
        :loading="fetching"
        :email="showEmailField"
        :username="showUsernameField"
        :password="showPasswordField"
        :totp="showTotpField"
        :disable-errors="!isSignup"
        @submit="onSubmit"
      >
      </sign-on>
      <options v-if="showOptions" v-bind="optionsProps"> </options>
    </div>
  </div>
  <span class="inflate"></span>
  <navbar
    class="footer"
    @theme-switch="onSwitchTheme"
    :checked="theme == THEME_DARK"
  >
    hello world
  </navbar>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  THEME_LIGHT,
  THEME_DARK,
  GetDefaultTheme,
  SwitchTheme,
} from "fibonacci-styles/util";
import SignOn, {
  FIELD_USERNAME,
  FIELD_PASSWORD,
  FIELD_TOTP,
} from "@/components/SignOn.vue";
import Banner from "@/components/AppBanner.vue";
import Options from "@/components/SignOptions.vue";
import Warning from "@/components/WarningCard.vue";
import Navbar from "@/components/NavBar.vue";
import RauthService, { ResponseHandler, Error } from "@/rauth.service";
import * as constants from "@/constants";
import * as cookies from "@/cookies.manager";

export default defineComponent({
  name: "App",
  components: {
    Banner,
    SignOn,
    Options,
    Warning,
    Navbar,
  },

  setup() {
    return {
      THEME_LIGHT,
      THEME_DARK,
    };
  },

  data() {
    return {
      theme: THEME_LIGHT,
      fetching: false,
      disableEmail: false,
      disablePassword: false,
      disableTotp: true,
      rauthService: new RauthService(
        process.env.VUE_APP_RAUTH_URI,
        this as unknown as ResponseHandler
      ),
      warning: undefined as constants.WarningProp | undefined,
    };
  },

  created() {
    if (this.token && constants.SIGNUP_PATH.test(window.location.pathname))
      this.onSubmit({});
  },

  computed: {
    token(): string | undefined {
      if (!constants.queryParams) return undefined;

      let paramsByKey: { [key: string]: string } = {};
      constants.queryParams.match(/\w=\w*/)?.forEach((param: string) => {
        const item = param.split("=");
        paramsByKey[item[0]] = item[1];
      });

      return paramsByKey[process.env.VUE_APP_TOKEN_QUERY_PARAM];
    },

    redirect(): string | undefined {
      if (!constants.queryParams) return undefined;

      let paramsByKey: { [key: string]: string } = {};
      constants.queryParams.match(/\w=\w*/)?.forEach((param: string) => {
        const item = param.split("=");
        paramsByKey[item[0]] = item[1];
      });

      return paramsByKey[process.env.VUE_APP_REDIRECT_QUERY_PARAM];
    },

    isSignup(): boolean {
      return constants.SIGNUP_PATH.test(window.location.pathname);
    },

    bannerTitle(): string {
      const pathname = window.location.pathname;
      if (this.token && constants.RESET_PATH.test(pathname))
        return constants.BANNER_TITLES[pathname];

      return (
        constants.BANNER_TITLES[pathname] ??
        constants.BANNER_TITLES[constants.LOGIN_PATH_ROOT]
      );
    },

    submitTitle(): string {
      return (
        constants.SUBMIT_TITLES[window.location.pathname] ??
        constants.SUBMIT_TITLES[constants.LOGIN_PATH_ROOT]
      );
    },

    optionsProps(): unknown {
      return (
        constants.OPTIONS_PROPS[window.location.pathname] ??
        constants.OPTIONS_PROPS[constants.LOGIN_PATH_ROOT]
      );
    },

    showOptions(): boolean {
      const pathname = window.location.pathname;
      return (
        this.disableTotp &&
        !this.fetching &&
        (constants.SIGNUP_PATH.test(pathname) ||
          constants.LOGIN_PATH.test(pathname) ||
          constants.RESET_PATH.test(pathname))
      );
    },

    showEmailField(): boolean {
      const pathname = window.location.pathname;
      return (
        this.disableTotp &&
        !this.disableEmail &&
        (constants.SIGNUP_PATH.test(pathname) ||
          constants.LOGIN_PATH.test(pathname) ||
          (constants.RESET_PATH.test(pathname) && !this.token))
      );
    },

    showUsernameField(): boolean {
      return (
        !this.disableEmail &&
        constants.LOGIN_PATH.test(window.location.pathname)
      );
    },

    showPasswordField(): boolean {
      const pathname = window.location.pathname;
      return (
        this.disableTotp &&
        !this.disablePassword &&
        (constants.SIGNUP_PATH.test(pathname) ||
          constants.LOGIN_PATH.test(pathname) ||
          (constants.RESET_PATH.test(pathname) && !!this.token))
      );
    },

    showTotpField(): boolean {
      return !this.disableTotp;
    },
  },

  methods: {
    async onSubmit(fields: any) {
      this.fetching = true;

      const email = fields[FIELD_USERNAME] ?? undefined;
      const pwd = fields[FIELD_PASSWORD] ?? undefined;
      const totp = fields[FIELD_TOTP] ?? undefined;
      const headers: { [key: string]: string } = {};

      if (this.token) {
        const tokenHeader = process.env.VUE_APP_JWT_HEADER;
        headers[tokenHeader] = this.token;
      }

      const requests: { [key: string]: any } = {
        [constants.SIGNUP_PATH_ROOT]: () =>
          this.rauthService.signup(email, pwd, headers),
        [constants.LOGIN_PATH_ROOT]: () =>
          this.rauthService.login(email, pwd, totp, headers),
        [constants.RESET_PATH_ROOT]: () =>
          this.rauthService.reset(email, pwd, totp, headers),
      };

      let pathname = window.location.pathname;
      if (constants.LOGIN_PATH.test(pathname))
        pathname = constants.LOGIN_PATH_ROOT;

      requests[pathname]();
    },

    performRedirect(): void {
      let targetLocation =
        this.redirect ?? process.env.VUE_APP_DEFAULT_REDIRECT;
      window.location.replace(targetLocation);
    },

    onResponseError(error: Error): void {
      this.fetching = false;

      if (error == Error.ERR_UNAUTHORIZED) {
        this.disableTotp = false;
        return;
      }

      this.warning = constants.WARNING_PROPS[error];
      if (this.warning) return;

      this.warning = constants.WARNING_PROPS[Error.ERR_UNKNOWN];
      if (this.warning) this.warning.text = error;
    },

    onResponseSuccess(): void {
      this.fetching = false;

      let pathname = window.location.pathname;
      if (constants.RESET_PATH.test(pathname)) {
        window.location.href = constants.LOGIN_PATH_ROOT;
        return;
      }

      this.performRedirect();
    },

    onResponseMetadata(metadata: any): void {
      const tokenHeader = process.env.VUE_APP_JWT_HEADER;
      if (metadata[tokenHeader]) {
        const tokenCookieKey = process.env.VUE_APP_TOKEN_COOKIE_KEY;
        cookies.setCookie(tokenCookieKey, metadata[tokenHeader]);
      }
    },

    quitWarning() {
      this.warning = undefined;
    },

    onSwitchTheme() {
      this.theme = SwitchTheme(
        this.theme,
        process.env.VUE_APP_THEME_STORAGE_KEY
      );
    },
  },

  mounted() {
    this.theme = GetDefaultTheme(process.env.VUE_APP_THEME_STORAGE_KEY);
  },
});
</script>

<style lang="scss">
@import "fibonacci-styles";

* {
  margin: 0;
  padding: 0;
  font-family: "Raleway", Helvetica, Arial, sans-serif;
}

body {
  min-height: 100vh;
  width: 100%;
  background: var(--color-background-secondary);
}

.container {
  width: $fib-13 * 1px;
  padding-top: $fib-5 * 1vh;
}

.centered-column {
  display: flex;
  align-items: center;
  flex-direction: column;
}

#app {
  @extend .centered-column;
  height: 100vh;
}

.loader-container {
  @extend .centered-column;
  padding-bottom: $fib-9 * 1px;
}

.card {
  @extend .round-corners, .fib-6;

  padding-top: $fib-7 * 1px;
  padding-bottom: $fib-7 * 1px;
  border: 1px solid;
  border-color: var(--color-text-disabled);
  background: var(--color-background-primary);

  &.shadowed {
    -moz-box-shadow: 0px 2px 3px 1px #00000020 !important;
    -webkit-box-shadow: 0px 2px 3px 1px #00000020 !important;
    box-shadow: 0px 2px 3px 1px #00000020 !important;
  }
}

.warning-message {
  margin-bottom: $fib-7 * 1px;
}

.inflate {
  flex: 1;
}

.footer {
  margin-top: $fib-5 * 1vh;
}
</style>
