/**
 * @param {Object} mappping - An object with key value pairs to replace in the url
 */
export default (mappping) => {
  return {
    Url(url) {
      for (const [key, value] of Object.entries(mappping)) {
        const replacementKey = `\${${key}}`;
        if (url.url.includes(replacementKey)) {
          url.url = url.url.replace(replacementKey, value);
          return url;
        }
      }
    },
  };
};
