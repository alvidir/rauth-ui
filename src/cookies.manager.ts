function setCookie(key: string, value: string, exp?: number, path?: string) {
  let expires = "";

  if (exp) {
    const date = new Date();
    date.setTime(date.getTime() + exp);
    expires = "; expires=" + date.toUTCString();
  }

  const pathname = path ? `; path=${path}` : "";
  document.cookie = `${key}=${value || ""}${expires}${pathname}`;
}

function getCookie(key: string) {
  const keyEQ = `${key}=`;
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.indexOf(keyEQ) === 0)
      return cookie.substring(keyEQ.length, cookie.length);
  }

  return null;
}

export { setCookie, getCookie };
