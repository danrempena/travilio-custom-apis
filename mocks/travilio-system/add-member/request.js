import faker from 'faker'

export default {
  generateMembers: (count = 1, defaults = {}) => {
    const users = []
    for (let i = 0; i < count; i++) {
      users.push({
        'memberUsername': '',
        'memberPassword': '',
        'firstName': faker.name.firstName(),
        'lastName': faker.name.lastName(),
        'email': faker.internet.email(),
        ...defaults
      })
    }
    return users
  }
}
