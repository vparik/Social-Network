const routes = {
  "/register": RegisterPage,
  "/login": LoginPage,
  "/": HomePage,
  "/profile": ProfilePage
};

const publicRoutes = ["/login", "/register"]

const App = {
  computed: {
    CurrentComponent() {
      return routes[window.Router.state.path]
    }
  },

  template: `
    <component :is="CurrentComponent"></component>
  `
};

const app = Vue.createApp(App);

app.component("Navbar", Navbar);
app.component("ChatSidebar", ChatSidebar);
app.component("ChatBox", ChatBox);

app.mount("#app");