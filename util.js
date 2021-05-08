module.exports.pause = async (ms) => {
  console.log('Pausing because of that dang rate limit...');
  await new Promise(resolve => setTimeout(resolve, ms))
};
