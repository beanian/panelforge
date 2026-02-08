import { PrismaClient, BuildStatus, PinMode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Panel Sections ────────────────────────────────────
  const panelSections = [
    {
      name: 'Air Supply',
      slug: 'air-supply',
      widthMm: 145,
      heightMm: 370,
      dzusSizes: '342/275',
      sortOrder: 0,
      sourceMsn: 'E3232',
    },
    {
      name: 'Fuel',
      slug: 'fuel',
      widthMm: 145,
      heightMm: 370,
      dzusSizes: '342/275',
      sortOrder: 1,
      sourceMsn: 'E3232',
    },
    {
      name: 'Ice Protect',
      slug: 'ice-protect',
      widthMm: 145,
      heightMm: 190,
      dzusSizes: '342/342',
      sortOrder: 2,
    },
    {
      name: 'APU',
      slug: 'apu',
      widthMm: 145,
      heightMm: 125,
      dzusSizes: '342/342',
      sortOrder: 3,
    },
    {
      name: 'Engines & Ice',
      slug: 'engines-ice',
      widthMm: 145,
      heightMm: 245,
      dimensionNotes: 'Uses 370 rail',
      sortOrder: 4,
      sourceMsn: 'E2233',
    },
    {
      name: 'Lights & AC',
      slug: 'lights-ac',
      widthMm: 215,
      heightMm: 325,
      dzusSizes: '275/275',
      sortOrder: 5,
      sourceMsn: 'E3232',
    },
    {
      name: 'Engine Fire Detect',
      slug: 'engine-fire-detect',
      widthMm: 145,
      heightMm: 85,
      dzusSizes: '95/95',
      sortOrder: 6,
    },
    {
      name: 'Misc & Hydraulic',
      slug: 'misc-hydraulic',
      widthMm: 215,
      heightMm: 325,
      dzusSizes: '275/275',
      sortOrder: 7,
      sourceMsn: 'E3137',
    },
    {
      name: 'Electric',
      slug: 'electric',
      widthMm: 145,
      heightMm: 370,
      dzusSizes: '342/342',
      sortOrder: 8,
      sourceMsn: 'E3232',
    },
    {
      name: 'Lights & Belts',
      slug: 'lights-belts',
      widthMm: 435,
      heightMm: 95,
      sortOrder: 9,
      sourceMsn: 'E1144',
    },
    {
      name: 'Fan',
      slug: 'fan',
      widthMm: 145,
      heightMm: 85,
      dzusSizes: '95/95',
      sortOrder: 10,
    },
    {
      name: 'Pressurisation',
      slug: 'pressurisation',
      widthMm: 145,
      heightMm: 180,
      dimensionNotes: 'Uses 370 rail',
      sortOrder: 11,
    },
  ];

  for (const section of panelSections) {
    await prisma.panelSection.upsert({
      where: { slug: section.slug },
      update: section,
      create: section,
    });
  }
  console.log(`  ✓ ${panelSections.length} panel sections`);

  // ─── Component Types ───────────────────────────────────
  const componentTypes = [
    {
      name: 'Gauge',
      description: 'Stepper motor gauge (DIR + STEP pins)',
      defaultPinCount: 2,
      pinLabels: ['Step', 'Direction'],
      pinTypes: ['DIGITAL', 'DIGITAL'],
      pinPowerRails: ['NINE_V', 'NINE_V'],
      pinMosfetRequired: [false, false],
      defaultPinMode: PinMode.OUTPUT,
      typicalCurrentMa: 20,
      standbyCurrentMa: 0,
    },
    {
      name: 'Annunciator',
      description: 'LED annunciator light (27/28V via MOSFET)',
      defaultPinCount: 1,
      pinLabels: ['LED'],
      pinTypes: ['DIGITAL'],
      pinPowerRails: ['TWENTY_SEVEN_V'],
      pinMosfetRequired: [true],
      defaultPinMode: PinMode.OUTPUT,
      typicalCurrentMa: 80,
      standbyCurrentMa: 0,
    },
    {
      name: 'Toggle Switch',
      description: 'Single-position toggle switch',
      defaultPinCount: 1,
      pinLabels: ['Signal'],
      pinTypes: ['DIGITAL'],
      pinPowerRails: ['NONE'],
      pinMosfetRequired: [false],
      defaultPinMode: PinMode.INPUT,
      typicalCurrentMa: 0,
      standbyCurrentMa: 0,
    },
    {
      name: 'Two-Position Switch',
      description: 'Two-position toggle switch with two pins',
      defaultPinCount: 2,
      pinLabels: ['Position 1', 'Position 2'],
      pinTypes: ['DIGITAL', 'DIGITAL'],
      pinPowerRails: ['NONE', 'NONE'],
      pinMosfetRequired: [false, false],
      defaultPinMode: PinMode.INPUT,
      typicalCurrentMa: 0,
      standbyCurrentMa: 0,
    },
    {
      name: 'Pushbutton',
      description: 'Momentary pushbutton',
      defaultPinCount: 1,
      pinLabels: ['Signal'],
      pinTypes: ['DIGITAL'],
      pinPowerRails: ['NONE'],
      pinMosfetRequired: [false],
      defaultPinMode: PinMode.INPUT,
      typicalCurrentMa: 0,
      standbyCurrentMa: 0,
    },
    {
      name: 'Illuminated Pushbutton',
      description: 'Pushbutton with integrated LED indicator',
      defaultPinCount: 2,
      pinLabels: ['Button', 'LED'],
      pinTypes: ['DIGITAL', 'DIGITAL'],
      pinPowerRails: ['FIVE_V', 'TWENTY_SEVEN_V'],
      pinMosfetRequired: [false, true],
      defaultPinMode: PinMode.INPUT,
      typicalCurrentMa: 25,
      standbyCurrentMa: 25,
    },
    {
      name: 'Potentiometer',
      description: 'Analog potentiometer / dimmer',
      defaultPinCount: 1,
      pinLabels: ['Wiper'],
      pinTypes: ['ANALOG'],
      pinPowerRails: ['NONE'],
      pinMosfetRequired: [false],
      defaultPinMode: PinMode.INPUT,
      typicalCurrentMa: 0,
      standbyCurrentMa: 0,
    },
    {
      name: 'Rotary Encoder',
      description: 'Rotary encoder with A/B channels',
      defaultPinCount: 2,
      pinLabels: ['Channel A', 'Channel B'],
      pinTypes: ['DIGITAL', 'DIGITAL'],
      pinPowerRails: ['NONE', 'NONE'],
      pinMosfetRequired: [false, false],
      defaultPinMode: PinMode.INPUT,
      typicalCurrentMa: 0,
      standbyCurrentMa: 0,
    },
  ];

  for (const ct of componentTypes) {
    await prisma.componentType.upsert({
      where: { name: ct.name },
      update: ct,
      create: ct,
    });
  }
  console.log(`  ✓ ${componentTypes.length} component types`);

  // ─── Board Alpha ───────────────────────────────────────
  await prisma.board.upsert({
    where: { name: 'Alpha' },
    update: {},
    create: {
      name: 'Alpha',
      boardType: 'Arduino Mega 2560',
      digitalPinCount: 54,
      analogPinCount: 16,
      pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      notes: 'First board — partially allocated per existing spreadsheet data',
    },
  });
  console.log('  ✓ Board Alpha');

  // MOSFET boards are created via the UI (8 channels each)

  // ─── PSU Config ───────────────────────────────────────────
  await prisma.psuConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      capacityWatts: 350,
      converterEfficiency: 0.87,
      name: 'Main PSU',
    },
  });
  console.log('  ✓ PSU Config');

  console.log('\nSeed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
