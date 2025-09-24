console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('JWT_ACCESS_SECRET:', process.env.JWT_ACCESS_SECRET ? 'SET' : 'NOT SET');
console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? 'SET' : 'NOT SET');
console.log('JWT_ACCESS_TTL:', process.env.JWT_ACCESS_TTL || 'NOT SET');
console.log('JWT_REFRESH_TTL:', process.env.JWT_REFRESH_TTL || 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');
