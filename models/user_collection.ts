/* Discord User Collection */

interface UserCollection {
    [key: string]: {
        userId: string;
        reason: string;
    };
}

export default UserCollection;