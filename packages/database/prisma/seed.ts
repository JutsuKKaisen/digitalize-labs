import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

const prisma = new PrismaClient();

// ============================================================
// CONFIGURE YOUR ADMIN ACCOUNTS HERE
// ============================================================
// Add or remove accounts as needed before running: npm run db:seed
// Password will be hashed with SHA-256 + salt before storing.

const ADMIN_ACCOUNTS = [
    {
        email: "admin@digitalizelabs.vn",
        password: "Admin@2026!",
        name: "Super Admin",
        role: "superadmin",
    },
    {
        email: "manager@digitalizelabs.vn",
        password: "Manager@2026!",
        name: "Content Manager",
        role: "admin",
    },
    {
        email: "reviewer@digitalizelabs.vn",
        password: "Reviewer@2026!",
        name: "Document Reviewer",
        role: "admin",
    }
];

// ============================================================

function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256")
        .update(salt + password)
        .digest("hex");
    return `${salt}:${hash}`;
}

async function main() {
    console.log("🌱 Seeding database...\n");

    // Seed admin users
    for (const account of ADMIN_ACCOUNTS) {
        const existing = await prisma.adminUser.findUnique({
            where: { email: account.email },
        });

        if (existing) {
            console.log(`  ⏭️  Admin "${account.email}" already exists, skipping.`);
            continue;
        }

        const user = await prisma.adminUser.create({
            data: {
                email: account.email,
                hashedPassword: hashPassword(account.password),
                name: account.name,
                role: account.role,
                isActive: true,
            },
        });

        console.log(`  ✅ Created admin: ${user.email} (${user.role})`);
    }

    console.log("\n🎉 Seed completed!");
    console.log("\n📋 Admin accounts summary:");
    console.log("─".repeat(50));
    for (const account of ADMIN_ACCOUNTS) {
        console.log(`  Email:    ${account.email}`);
        console.log(`  Password: ${account.password}`);
        console.log(`  Role:     ${account.role}`);
        console.log("─".repeat(50));
    }
    console.log(
        "\n⚠️  Change the default passwords in prisma/seed.ts before production!"
    );
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
