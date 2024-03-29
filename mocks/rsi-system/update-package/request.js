import faker from 'faker'
export default {
  updateMembersPackage: (count = 1, defaults = {}) => {
    const users = []
    for (let i = 0; i < count; i++) {
      users.push({
        'rsiId': faker.random.number({ min: 1, max: 1999 }),
        'packageId': faker.random.number({ min: 1, max: 1999 }),
        ...defaults
      })
    }
    return users
  }
}
