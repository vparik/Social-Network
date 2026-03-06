const routes = {
  "/register": RegisterPage,
  "/login": LoginPage,
  "/": HomePage
};

const publicRoutes = ["/login", "/register"]

const App = {
  computed: {
    CurrentComponent() {
      return routes[Router.state.path];
    }
  },

  template: `
    <component :is="CurrentComponent"></component>
  `
};

Vue.createApp(App).mount("#app");