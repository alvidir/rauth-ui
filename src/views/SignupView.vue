<script setup lang="ts">
import { ref, computed, onBeforeMount } from "vue";
import ViewHeader from "@/components/ViewHeader.vue";
import { Token, signup } from "@/services/rauth.rpc";
import config from "@/config.json";
import { setCookie } from "@/cookies";
import { redirect, token } from "@/queryParams";
import { Warning } from "@/warning";
import { useWarningStore } from "@/stores/warning";
import { emailRegex, passwordRegex } from "@/regex";
import i18n from "@/i18n/en.json";

const warningStore = useWarningStore();

const email = ref("");
const emailError = ref("");

const password = ref("");
const passwordError = ref("");

const loading = ref(false);

const isValid = computed((): boolean => {
  return (
    !!email.value &&
    !!password.value &&
    !emailError.value &&
    !passwordError.value
  );
});

const onEmailInput = () => {
  if (email.value.length && !emailRegex.test(email.value)) {
    emailError.value = i18n.ErrInvalidEmail;
  } else {
    emailError.value = "";
  }
};

const onPasswordInput = () => {
  if (password.value.length && !passwordRegex.test(password.value)) {
    passwordError.value = i18n.ErrInvalidPassword;
  } else {
    passwordError.value = "";
  }
};

const onSubmit = () => {
  loading.value = true;

  const headers = token
    ? {
        [config.JWT_HEADER]: token,
      }
    : {};

  signup(email.value, password.value, headers)
    .then((token: Token) => {
      const key = config.TOKEN_COOKIE_KEY;
      const domain = config.ALVIDIR_BASE_URI;
      setCookie(key, token, domain);
      const targetLocation = redirect ?? config.LOGIN_REDIRECT;
      window.location.replace(targetLocation);
    })
    .catch((warning: Warning) => {
      warningStore.add(warning);
    })
    .finally(() => {
      loading.value = false;
    });
};

onBeforeMount(() => {
  if (token) onSubmit();
});
</script>

<template>
  <div>
    <view-header :title="i18n.SignupTitle"></view-header>
    <regular-field
      v-model="email"
      :placeholder="i18n.Email"
      :error="emailError"
      :readonly="loading"
      @input="onEmailInput"
      large
    ></regular-field>

    <regular-field
      v-model="password"
      :placeholder="i18n.Password"
      :error="passwordError"
      :readonly="loading"
      type="password"
      @input="onPasswordInput"
      large
    ></regular-field>

    <submit-button
      :disabled="!isValid"
      :loading="loading"
      @submit="onSubmit()"
      large
    >
      {{ i18n.Signup }}
    </submit-button>

    <nav>
      <router-link to="/login">{{ i18n.AlreadyHaveAnAccount }}</router-link>
    </nav>
  </div>
</template>

<style scoped lang="scss">
@import "fibonacci-styles";
</style>
