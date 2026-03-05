const routes = {
  "/register": RegisterPage,
  "/login": LoginPage,
  "/": HomePage
};

const App = {
  computed: {
    CurrentComponent() {
      return routes[Router.state.path] || HomePage;
    }
  },

  template: `
    <component :is="CurrentComponent"></component>
  `
};

Vue.createApp(App).mount("#app");