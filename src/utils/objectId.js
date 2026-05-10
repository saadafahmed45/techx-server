const { ObjectId } = require("mongodb");

const isValidObjectId = (id) => {
  return (
    ObjectId.isValid(id) &&
    String(new ObjectId(id)) === id
  );
};

module.exports = isValidObjectId;