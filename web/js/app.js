const routes = {
  "/register": RegisterPage,
  "/login": LoginPage,
  "/": HomePage,
  "/profile": HomePage // change it later to a real profile page
};

const publicRoutes = ["/login", "/register"]

const App = {
  computed: {
    CurrentComponent() {
      return routes[Router.state.path]; // || Homepage;
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