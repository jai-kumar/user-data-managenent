import React from "react";
import UserListItem from "../UserListItem/UserListItem";
import "./UserList.css";
import { useStateValue } from "../../StateProvider";
import Paginator from "../Paginator/Paginator";
import SearchBar from "../SearchBar/SearchBar";
import AddUser from "../AddUser/AddUser";

function UserList() {
  const [
    { users, searchedUsers, currentPageUsers },
    dispatch,
  ] = useStateValue();

  const handleSortByFav = (e) => {
    if (e.target.checked) {
      let favArr = [],
        nonFavArr = [];
      users.forEach((user) => {
        if (user.isFavorite) {
          favArr.push(user);
        } else {
          nonFavArr.push(user);
        }
      });

      dispatch({
        type: "UPDATE_SEARCHED_USER",
        users: favArr.concat(nonFavArr),
      });
    } else {
      dispatch({
        type: "UPDATE_SEARCHED_USER",
        users: [],
      });
    }
  };

  return (
    <div className="userList">
      <div className="userList__title">
        <h3>Friends List</h3>
      </div>
      <div className="userList__section left">
        <span className="userList__sorting">Sort by Favorite</span>
        <input
          type="checkbox"
          value="Sort by Favorite"
          onChange={handleSortByFav}
        />
      </div>
      <div className="userList__section">
        <SearchBar />
      </div>
      <div className="userList__section">
        <AddUser />
      </div>
      <div className="userList__list">
        {searchedUsers.length
          ? searchedUsers?.map((user) => (
              <UserListItem key={user.id} user={user} />
            ))
          : currentPageUsers?.map((user) => (
              <UserListItem key={user.id} user={user} />
            ))}
      </div>
      <div className="userList__paginator">
        <Paginator />
      </div>
    </div>
  );
}

export default UserList;
