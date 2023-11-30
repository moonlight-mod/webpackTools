export default function matchModule(moduleStr, queryArg) {
  const queryArray = queryArg instanceof Array ? queryArg : [queryArg];
  return queryArray.some((query) => {
    // we like our microoptimizations https://jsben.ch/Zk8aw
    if (query instanceof RegExp) {
      return query.test(moduleStr);
    } else {
      return moduleStr.includes(query);
    }
  });
}
