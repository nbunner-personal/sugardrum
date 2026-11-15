// Defaults for every blog post. URLs match the old Jekyll permalink
// `blog/:year/:month/:day/:title/`, using the post date in UTC.
const pad = (n) => String(n).padStart(2, "0");

export default {
  layout: "post",
  isPost: true,
  permalink(data) {
    const d = data.page.date;
    return `/blog/${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${data.page.fileSlug}/`;
  },
};
