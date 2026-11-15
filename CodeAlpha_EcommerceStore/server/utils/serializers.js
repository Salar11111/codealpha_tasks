export function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || 'customer',
    phone: user.phone || '',
    savedAddress: user.savedAddress || {},
    wishlist: (user.wishlist || []).map((item) => String(item?._id || item)),
  };
}
