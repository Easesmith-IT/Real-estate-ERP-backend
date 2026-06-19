const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const getPagination = (query = {}) => {
  const page = parsePositiveInt(query.page, 1);
  const limit = parsePositiveInt(query.limit, 25);
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

module.exports = {
  getPagination,
  parsePositiveInt,
};
