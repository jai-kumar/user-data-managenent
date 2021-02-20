export const initialState = {
  users: [{
    id: 1,
    name: 'Jai Kumar',
    isFavorite: false
  },{
    id: 2,
    name: 'Ashutosh Yadav',
    isFavorite: true
  },{
    id: 3,
    name: 'Chirag Khanna',
    isFavorite: false
  },{
    id: 4,
    name: 'Rajat Dhupar',
    isFavorite: false
  },{
    id: 5,
    name: 'Sunny',
    isFavorite: false
  },{
    id: 6,
    name: 'Tom',
    isFavorite: false
  },{
    id: 7,
    name: 'Jack',
    isFavorite: false
  },{
    id: 8,
    name: 'Harry',
    isFavorite: false
  },{
    id: 9,
    name: 'Goku',
    isFavorite: false
  },{
    id: 10,
    name: 'Naruto',
    isFavorite: false
  },{
    id: 11,
    name: 'Hinata',
    isFavorite: false
  },{
    id: 12,
    name: 'Tim',
    isFavorite: false
  }],
  currentPageUsers: [],
  searchedUsers: [],
  currentPage: 1,
  usersPerPage: 4
};

export const reducer = (state = initialState, action) => {
  let newUsers = [];
  switch (action.type) {
    case 'ADD_USER':
      return {
        ...state,
        users: [...state.users, action.user]
      }

    case 'REMOVE_USER':
      const index = state.users.findIndex(user => user.id === parseInt(action.id));
      newUsers = [...state.users];
      if(index >= 0) {
        newUsers.splice(index, 1);
      } else {
        console.warn(`Can't remove user (id: ${action.id}) as its not in users list!`);
      }
      return {
        ...state,
        users: newUsers
      }

    case 'UPDATE_USER':
      debugger
      newUsers = [...state.users].map(user => {
        if(user.id === parseInt(action.id)) {
          user.isFavorite = !user.isFavorite;
        }
        return user;
      });
      console.log('newUsers: ',newUsers);
      return {
        ...state,
        users: newUsers
      }

    case 'UPDATE_SEARCHED_USER':
      return {
        ...state,
        searchedUsers: action.users
      }

    case 'UPDATE_CURRENT_PAGE':
      return {
        ...state,
        currentPage: action.pageNumber,
        currentPageUsers: action.users
      }
  
    default:
      return {
        ...state
      }
  }
}