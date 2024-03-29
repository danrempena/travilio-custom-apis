import faker from 'faker'

export default {
  success: {
    'isSuccess': true,
    'rsiId': faker.random.number({ min: 1, max: 1999 }),
    'packageId': faker.random.number({ min: 1, max: 1999 }),
    'message': faker.name.jobDescriptor()
  },
  fail: {
    'rsiId': faker.random.number({ min: 1, max: 1999 }),
    'packageId': faker.random.number({ min: 1, max: 1999 }),
    'isSuccess': false,
    'message': 'rsiId not found'
  }
}
