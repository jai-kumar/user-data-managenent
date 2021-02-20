import React, { useEffect, useRef, useState } from 'react';
import UserListItem from "../UserListItem/UserListItem";
import "./UserList.css";
// import UserList from "./components/UserList/UserList";
import { UserContext } from "../../UserContext";
import { useStateValue } from '../../StateProvider';

function UserList() {
  // const [searchedUsers, setSearchedUsers] = useState([]);
  const currentUser = useRef('');
  const searchBoxRef = useRef('');
  const [{ users, searchedUsers }, dispatch] = useStateValue();

  const handleSearch = function (e) {
    let matchedUsers = users.filter(user => {
      return user.name.toLowerCase().includes(e.target.value.toLowerCase())
    });

    dispatch({
      type: 'UPDATE_SEARCHED_USER',
      users: matchedUsers
    })
  }

  const handleSearchLeave = (e) => {
    dispatch({
      type: 'UPDATE_SEARCHED_USER',
      users: []
    });

    e.target.value = '';
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
    currentUser.current.value = '';
  }

  const handleSortByFav = (e) => {
    if(e.target.checked) {
      let favArr = [],
        nonFavArr = [];
      users.map(user => {
        if(user.isFavorite) {
          favArr.push(user);
        } else {
          nonFavArr.push(user);
        }
      });

      dispatch({
        type: 'UPDATE_SEARCHED_USER',
        users: favArr.concat(nonFavArr)
      });
    } else {
      dispatch({
        type: 'UPDATE_SEARCHED_USER',
        users: []
      });
    }
  }

  // console.log('userlist rendering....');
  return (
    <div className="userList">
      <UserContext.Provider value={users}>
        <div className="userList__title">
          <h3>Friends List</h3>
        </div>
        <div className="userList__searchSection">
          <input 
            type="checkbox" 
            value="Sort by Favorite"
            onChange={handleSortByFav}
          />
        </div>
        <div className="userList__searchSection">
          <input 
            type="text" 
            ref={searchBoxRef} 
            placeholder="Search your Friend's name" 
            onChange={handleSearch}
            onBlur={handleSearchLeave}
          />
        </div>
        <div className="userList__searchSection">
          <form onSubmit={handleAddUser}>
            <input type="text" ref={currentUser} placeholder="Enter your Friend's name"/>
          </form>
        </div>
        <div className="userList__list">
        {
          searchedUsers.length ?
            searchedUsers?.map(user => <UserListItem key={user.id} user={user} /> ) :
            users?.map(user => <UserListItem key={user.id} user={user} /> )
        }
      </div>
      </UserContext.Provider>
    </div>
  )
}

export default UserList
