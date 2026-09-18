const fs = require('fs');
global.window = global;
global.AppState = {
  currentUser: 'tester',
  users: {
    tester: { role: 'ceo', isAdmin: true },
    bad_guy: {}
  },
  complaints: [{ id: 'c1', target: 'bad_guy' }]
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

let code = fs.readFileSync('js/storage.js', 'utf8');
code = code.replace('function isUserCEO(username) {', `function isUserCEO(username) {
  console.log('INSIDE isUserCEO: username =', username);
  console.log('INSIDE isUserCEO: AppState =', typeof AppState, Object.keys(AppState));
  console.log('INSIDE isUserCEO: AppState.users =', AppState.users);
  console.log('INSIDE isUserCEO: AppState.users[username] =', AppState.users[username]);
`);

eval(code);

console.log('TEST CALL:');
const res = isUserCEO('tester');
console.log('FINAL RESULT:', res);
