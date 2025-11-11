module.exports = {
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "src"),
    },
  },
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
