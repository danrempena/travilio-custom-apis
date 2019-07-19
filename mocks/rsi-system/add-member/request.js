import faker from 'faker'
import hash from 'object-hash'

export default {
  generateMembers: (count = 1, defaults = {}) => {
    const users = []
    for (let i = 0; i < count; i++) {
      users.push({
        'memberUsername': faker.internet.userName(),
        'memberPassword': hash.MD5(faker.internet.password()),
        'firstName': faker.name.firstName(),
        'lastName': faker.name.lastName(),
        'email_1': faker.internet.email(),
        'phone_1': faker.phone.phoneNumberFormat(),
        'clubReferenceId': faker.random.number({ min: 1, max: 1999 }),
        'packageId': faker.random.number({ min: 1, max: 1999 }),
        ...defaults
      })
    }
    return users
  }
}
