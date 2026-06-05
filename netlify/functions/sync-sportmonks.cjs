const { _syncSportmonks } = require("./api.cjs");

exports.config = {
  schedule: "*/5 * * * *",
};

exports.handler = async () => {
  const result = await _syncSportmonks("latest");
  return {
    statusCode: result.ok ? 200 : 500,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(result),
  };
};
