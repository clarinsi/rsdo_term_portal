exports.deserialize = {
  userById(user) {
    const deserializedUser = {
      id: user.id,
      userName: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      hitsPerPage: user.hits_per_page,
      userRoles: user.user_roles,
      assignedConsultancyEntries: user.assigned_consultancy_entries
    }

    return deserializedUser
  },

  user(userData) {
    const deserializedData = {
      id: userData.id,
      userName: userData.username,
      firstName: userData.first_name,
      lastName: userData.last_name,
      email: userData.email,
      password: userData.password
    }

    return deserializedData
  },

  userRights(userData) {
    const deserializedRights = {
      id: userData.id,
      userName: userData.username,
      email: userData.email,
      hasAdministration: userData.administration,
      hasEditing: userData.editing,
      hasTerminologyReview: userData.terminology_review,
      hasLanguageReview: userData.language_review
    }
    return deserializedRights
  }
}
