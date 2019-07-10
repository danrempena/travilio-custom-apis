import faker from 'faker'

export default {
  success: {
    'rsiId': faker.random.number({ min: 1, max: 1999 }),
    'isSuccess': true,
    'message': 'Success'
  },
  fail: {
    'rsiId': faker.random.number({ min: 1, max: 1999 }),
    'isSuccess': false,
    'message': 'rsiId not found'
  }
}
