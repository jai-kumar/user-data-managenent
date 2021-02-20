import React, { useEffect, useRef } from 'react';
import UserListItem from "../UserListItem/UserListItem";
import "./UserList.css";
// import UserList from "./components/UserList/UserList";
import { UserContext } from "../../UserContext";
import { useStateValue } from '../../StateProvider';

function UserList() {
  const currentUser = useRef('');
  const [{ users }, dispatch] = useStateValue();

  useEffect(() => {
    // console.log('UserList mounted');
    // const dummyUsers = [{
    //   id: 1,
    //   name: 'Jai Kumar',
    //   isFavorite: false
    // },{
    //   id: 2,
    //   name: 'Ashutosh Yadav',
    //   isFavorite: false
    // },{
    //   id: 3,
    //   name: 'Chirag Khanna',
    //   isFavorite: false
    // },{
    //   id: 4,
    //   name: 'Rajat Dhupar',
    //   isFavorite: false
    // }];

    // setUsers(dummyUsers);
  }, []);

  const handleOnChange = function (e) {
    // debugger
    // currentUser.current = e.target.value;
    // setCurrentUser(e.target.value);
  }

  const handleAddUser = function (e) {
    e.preventDefault();
    dispatch({
      type: 'ADD_USER',
      user: {
        id: users[users.length-1].id+1,
        name: currentUser.current.value,
        isFavorite: false
      }
    })
    // setUsers(prevState => [
    //   ...prevState,
    //   {
    //     id: prevState[prevState.length-1].id+1,
    //     name: currentUser.current.value,
    //     isFavorite: false
    //   }
    // ])
  }

  // console.log('userlist rendering....');
  return (
    <div className="userList">
      <UserContext.Provider value={users}>
        <div className="userList__title">
          <h3>Friends List</h3>
        </div>
        <div className="userList__searchSection">
          <form onSubmit={handleAddUser}>
            <input type="text" ref={currentUser} placeholder="Enter your Friend's name" onChange={handleOnChange}/>
          </form>
        </div>
        <div className="userList__list">
        {
          users?.map(user => <UserListItem key={user.id} user={user} /> )
        }
      </div>
      </UserContext.Provider>
    </div>
  )
}

export default UserList
