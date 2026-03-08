window.MockChat = (function () {
  const users = [
    { id: 1, name: "Alice Brown", online: true },
    { id: 2, name: "John Smith", online: true },
    { id: 3, name: "Maria Doe", online: false },
    { id: 4, name: "Chris Evans", online: true }
  ];

  const conversations = {
    1: [
      { id: 1, fromMe: false, text: "Hey! How are you?" },
      { id: 2, fromMe: true, text: "I am good, you?" }
    ],
    2: [
      { id: 1, fromMe: false, text: "Are you coming later?" }
    ],
    3: [],
    4: [
      { id: 1, fromMe: true, text: "Hello!" },
      { id: 2, fromMe: false, text: "Hi there 👋" }
    ]
  };

  return {
    getUsers() {
      return users;
    },

    getMessages(userId) {
      return conversations[userId] ? [...conversations[userId]] : [];
    },

    sendMessage(userId, text) {
      if (!conversations[userId]) conversations[userId] = [];

      const newMessage = {
        id: Date.now(),
        fromMe: true,
        text: text
      };

      conversations[userId].push(newMessage);
      return newMessage;
    }
  };
})();