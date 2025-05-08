const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed the database with initial data
 */
async function main() {
  try {
    console.log('Starting seed...');

    // Create admin user "reza"
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'reza@admin.com' },
      update: {},
      create: {
        email: 'reza@admin.com',
        password: hashedPassword,
        name: 'Reza',
        isAdmin: true,
        bio: 'Administrator of the Digital Marketplace'
      }
    });

    console.log(`Created admin user: ${adminUser.name} (${adminUser.email})`);

    // Create some sample categories
    const categories = [
      { name: 'Templates', description: 'Website and app templates', slug: 'templates' },
      { name: 'Graphics', description: 'Graphic design assets', slug: 'graphics' },
      { name: 'UI Kits', description: 'User interface kits and components', slug: 'ui-kits' },
      { name: 'Fonts', description: 'Typography and font collections', slug: 'fonts' }
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: category
      });
    }

    console.log(`Created ${categories.length} categories`);

    // Create some sample tags
    const tags = [
      { name: 'Responsive', slug: 'responsive' },
      { name: 'Mobile-friendly', slug: 'mobile-friendly' },
      { name: 'Dark Mode', slug: 'dark-mode' },
      { name: 'Premium', slug: 'premium' },
      { name: 'Bootstrap', slug: 'bootstrap' },
      { name: 'Tailwind CSS', slug: 'tailwind-css' }
    ];

    for (const tag of tags) {
      await prisma.tag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: tag
      });
    }

    console.log(`Created ${tags.length} tags`);
    
    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();