let connectedUsers = [];

export const addNewUser = (user, socketId) => {
  const newUser = {
    ...user,
    socketId,
  };
  !connectedUsers.some((existingUser) => existingUser.id === user._id) &&
  connectedUsers.push(newUser);
};

export const removeUser = (socketId) => {
  connectedUsers = connectedUsers.filter((user) => user.socketId !== socketId);
};

export const getUserById = (id) => {
  const user = connectedUsers.find((user) => user._id == id);
  return user;
};
