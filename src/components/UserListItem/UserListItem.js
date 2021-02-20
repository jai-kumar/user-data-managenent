import React, { useRef } from 'react';
import FavoriteIcon from '@material-ui/icons/Favorite';
import FavoriteBorderIcon from '@material-ui/icons/FavoriteBorder';
import DeleteIcon from '@material-ui/icons/Delete';
import { useStateValue } from '../../StateProvider';

function UserListItem({ user }) {
  // console.log('list item rendering..');
  const removeBtnRef = useRef('');
  const favoriteBtnRef = useRef('');
  const [{}, dispatch] = useStateValue();

  const handleRemoveUser = (e) => {
    console.log(removeBtnRef.current.dataset.userid)
    dispatch({
      type: 'REMOVE_USER',
      id: removeBtnRef.current.dataset.userid
    })
  }

  const toggleFavoriteUser = (e) => {
    console.log('dispatching UPDATE');
    console.log(favoriteBtnRef.current.dataset.userid)
    dispatch({
      type: 'UPDATE_USER',
      id: favoriteBtnRef.current.dataset.userid
    })
  }
  
  console.log('uselistitem rendering..');

  return (
    <div className="userListItem">
      <span className="userListItem__name">
        {user.name}
      </span>
      <span className="userListItem__buttons">
        <button ref={favoriteBtnRef} className="fav" data-userid={user.id} onClick={toggleFavoriteUser}>
          {
            user.isFavorite ?
              <FavoriteIcon /> :
              <FavoriteBorderIcon />
          }
        </button>
        <button ref={removeBtnRef} className="remove" data-userid={user.id} onClick={handleRemoveUser}>
          <DeleteIcon />
        </button>
      </span>
    </div>
  )
}

export default UserListItem;