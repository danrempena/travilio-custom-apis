import faker from 'faker'

export default {
  success: {
    'isSuccess': true,
    'rsiMemberId': faker.random.number({ min: 1, max: 1999 }),
    'vipMemberId': faker.random.number({ min: 1, max: 1999 }),
    'crmMemberId': faker.random.number({ min: 1, max: 1999 }),
    'crmUserId': faker.random.number({ min: 1, max: 1999 })
  },
  fail: { 'isSuccess': false, 'errors': [{ 'field': 'StoredProcedure', 'errorMessage': 'Email is already taken' }] }
}
