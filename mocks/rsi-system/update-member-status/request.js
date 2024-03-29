import faker from 'faker'

export default {
  updateMembersStatus: (count = 1, defaults = {}) => {
    const users = []
    for (let i = 0; i < count; i++) {
      users.push({
        'rsiMemberId': faker.random.number({ min: 1, max: 1999 }),
        'isActive': true,
        'blockReason': faker.name.jobDescriptor(),
        ...defaults
      })
    }
    return users
  }
}
