export default {
  '/member/': { // add member
    'memberUsername': '',
    'memberPassword': '',
    'firstName': '',
    'lastName': '',
    'email1': '',
    'phone1': '',
    'clubReferenceId': '',
    'packageId': '',
    'hotelRewards': 200,
    'condoRewards': 0
  },
  '/member/[rsi_id]/activestatus': {
    'isActive': '',
    'blockReason': ''
  },
  '/member/[rsi_id]/package': {
    'packageId': ''
  },
  '/member': { // update member info
    'first_name': '',
    'last_name': '',
    'email_1': '',
    'phone_1': '',
    'address_1': '',
    'address_2': '',
    'city': '',
    'state_code': '',
    'postal_code': '',
    'clubReference': ''
  }
}
