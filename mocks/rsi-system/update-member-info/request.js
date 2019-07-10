import faker from 'faker'

export default {
  updateMemberInfo: (count = 1, defaults = {}) => {
    const users = []
    for (let i = 0; i < count; i++) {
      users.push({
        'clubReference': faker.name.jobDescriptor(),
        'first_name': faker.name.firstName(),
        'middle_name': faker.name.suffix(),
        'last_name': faker.name.lastName(),
        'address_1': faker.address.streetAddress(),
        'address_2': faker.address.secondaryAddress(),
        'city': faker.address.city(),
        'state_code': faker.address.state(),
        'postal_code': faker.address.zipCode(),
        'country_code': faker.address.countryCode(),
        'phone_1': faker.phone.phoneNumberFormat(),
        'phone_2': faker.phone.phoneNumberFormat(),
        'email_1': faker.internet.email(),
        'is_active': true,
        'rsi_id': faker.random.number({ min: 1, max: 1999 }),
        ...defaults
      })
    }
    return users
  }
}
