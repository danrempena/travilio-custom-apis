import faker from 'faker'

export default {
  updateMemberInfo: (count = 1, defaults = {}) => {
    const users = []
    for (let i = 0; i < count; i++) {
      users.push({
        'firstName': faker.name.firstName(),
        'lastName': faker.name.lastName(),
        'email_1': faker.internet.email(),
        'phone_1': faker.phone.phoneNumberFormat(),
        'address_1': faker.address.streetAddress(),
        'address_2': faker.address.secondaryAddress(),
        'city': faker.address.city(),
        'state_code': faker.address.state(),
        'postal_code': faker.address.zipCode(),
        'clubReferenceId': faker.name.jobDescriptor(),
        ...defaults
      })
    }
    return users
  }
}
