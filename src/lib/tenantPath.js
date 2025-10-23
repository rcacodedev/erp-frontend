export const tpath = (orgSlug, subpath) =>
  `/t/${orgSlug}${subpath.startsWith("/") ? subpath : `/${subpath}`}`;
