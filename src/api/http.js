import axios from "axios";

const http = axios.create({
  baseURL: "/api/v1",
  withCredentials: true, // para que viaje la cookie HttpOnly del refresh
});

// store de access token en memoria
let accessToken = null;
export const setAccessToken = (t) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

http.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing = null;
http.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing =
        refreshing ||
        axios
          .post("/api/v1/auth/refresh", {}, { withCredentials: true })
          .then((res) => {
            setAccessToken(res.data.access);
            return res.data.access;
          })
          .finally(() => {
            refreshing = null;
          });
      const newAccess = await refreshing;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return http(original);
    }
    return Promise.reject(err);
  }
);

export default http;
