
export default function requireRole(expectedRole) {
  return (req, res, next) => {
    try {
      if (!req.userId || !req.userRole) {
        return res.status(401).json({ message: 'No autenticado' })
      }
      if (req.userRole !== expectedRole) {
        return res.status(403).json({ message: 'Permiso denegado' })
      }
      return next()
    } catch (e) {
      console.error('requireRole error', e)
      return res.status(500).json({ message: 'Error interno en autorización' })
    }
  }
}