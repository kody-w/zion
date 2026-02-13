/**
 * ZION MMO - Procedural 3D Model Generators
 * Creates complex Three.js meshes from primitive geometries
 * Compatible with Three.js r128
 */

(function(exports) {
  'use strict';

  // ========================================
  // TREE GENERATORS
  // ========================================

  function createTree(type, scale) {
    scale = scale || 1;
    const group = new THREE.Group();
    group.name = 'tree_' + type;
    group.userData.animationType = 'sway';
    group.userData.swayAmount = 0.05;
    group.userData.swaySpeed = 1.0;

    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
    const darkTrunk = new THREE.MeshLambertMaterial({ color: 0x3a2718 });

    switch(type) {
      case 'oak':
        // Thick trunk with visible roots
        const oakTrunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 3 * scale, 8),
          trunkMaterial
        );
        oakTrunk.position.y = 1.5 * scale;
        group.add(oakTrunk);

        // Roots at base
        for (let i = 0; i < 4; i++) {
          const root = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, 0.5 * scale, 6),
            darkTrunk
          );
          root.position.y = 0.1 * scale;
          const angle = (i / 4) * Math.PI * 2;
          root.position.x = Math.cos(angle) * 0.3 * scale;
          root.position.z = Math.sin(angle) * 0.3 * scale;
          root.rotation.z = Math.PI / 6;
          root.rotation.y = angle;
          group.add(root);
        }

        // Large overlapping spherical canopy
        const canopyColors = [0x2d5016, 0x3a6b1f, 0x4a8028];
        for (let i = 0; i < 8; i++) {
          const leafBall = new THREE.Mesh(
            new THREE.SphereGeometry(0.8 * scale, 8, 6),
            new THREE.MeshLambertMaterial({
              color: canopyColors[Math.floor(Math.random() * canopyColors.length)]
            })
          );
          const angle = (i / 8) * Math.PI * 2;
          const radius = 0.6 * scale;
          leafBall.position.x = Math.cos(angle) * radius;
          leafBall.position.z = Math.sin(angle) * radius;
          leafBall.position.y = 3 * scale + Math.random() * 0.4 * scale;
          group.add(leafBall);
        }

        // Central canopy sphere
        const centerCanopy = new THREE.Mesh(
          new THREE.SphereGeometry(1 * scale, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0x3a6b1f })
        );
        centerCanopy.position.y = 3.2 * scale;
        group.add(centerCanopy);
        break;

      case 'pine':
        // Tall narrow trunk
        const pineTrunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2 * scale, 0.25 * scale, 4 * scale, 8),
          trunkMaterial
        );
        pineTrunk.position.y = 2 * scale;
        group.add(pineTrunk);

        // Stacked cone layers
        const pineMaterial = new THREE.MeshLambertMaterial({ color: 0x1a4d2e });
        const coneSizes = [1.2, 1.0, 0.8, 0.6];
        for (let i = 0; i < coneSizes.length; i++) {
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(coneSizes[i] * scale, 1.5 * scale, 8),
            pineMaterial
          );
          cone.position.y = (2 + i * 1.2) * scale;
          group.add(cone);
        }

        // Top point
        const top = new THREE.Mesh(
          new THREE.ConeGeometry(0.3 * scale, 0.8 * scale, 6),
          pineMaterial
        );
        top.position.y = 6.5 * scale;
        group.add(top);
        break;

      case 'willow':
        // Medium trunk
        const willowTrunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25 * scale, 0.3 * scale, 2.5 * scale, 8),
          trunkMaterial
        );
        willowTrunk.position.y = 1.25 * scale;
        group.add(willowTrunk);

        // Drooping branches
        const willowGreen = new THREE.MeshLambertMaterial({ color: 0x90ee90 });
        const branchMaterial = new THREE.MeshLambertMaterial({ color: 0x5a4a38 });

        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const branchLength = 1.5 * scale;

          // Drooping branch
          const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03 * scale, 0.02 * scale, branchLength, 4),
            branchMaterial
          );
          branch.position.x = Math.cos(angle) * 0.2 * scale;
          branch.position.z = Math.sin(angle) * 0.2 * scale;
          branch.position.y = 2.5 * scale - branchLength / 2;
          branch.rotation.z = Math.PI / 4;
          branch.rotation.y = angle;
          group.add(branch);

          // Leaves along branch
          for (let j = 0; j < 3; j++) {
            const leaf = new THREE.Mesh(
              new THREE.SphereGeometry(0.15 * scale, 6, 4),
              willowGreen
            );
            leaf.position.x = Math.cos(angle) * (0.3 + j * 0.3) * scale;
            leaf.position.z = Math.sin(angle) * (0.3 + j * 0.3) * scale;
            leaf.position.y = (2.2 - j * 0.4) * scale;
            group.add(leaf);
          }
        }
        break;

      case 'cherry':
        // Medium trunk
        const cherryTrunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 2.5 * scale, 8),
          trunkMaterial
        );
        cherryTrunk.position.y = 1.25 * scale;
        group.add(cherryTrunk);

        // Pink/white blossom clusters
        const blossomColors = [0xffb7c5, 0xffc0cb, 0xffd1dc, 0xffffff];
        for (let i = 0; i < 20; i++) {
          const blossom = new THREE.Mesh(
            new THREE.SphereGeometry(0.2 * scale, 6, 4),
            new THREE.MeshLambertMaterial({
              color: blossomColors[Math.floor(Math.random() * blossomColors.length)]
            })
          );
          const angle = Math.random() * Math.PI * 2;
          const radius = 0.4 + Math.random() * 0.6;
          blossom.position.x = Math.cos(angle) * radius * scale;
          blossom.position.z = Math.sin(angle) * radius * scale;
          blossom.position.y = (2 + Math.random() * 1) * scale;
          group.add(blossom);
        }
        break;

      case 'dead':
        // Grey trunk
        const deadTrunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, 3 * scale, 8),
          new THREE.MeshLambertMaterial({ color: 0x666666 })
        );
        deadTrunk.position.y = 1.5 * scale;
        group.add(deadTrunk);

        // Bare branches
        const deadBranchMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        for (let i = 0; i < 6; i++) {
          const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05 * scale, 0.02 * scale, 1 * scale, 4),
            deadBranchMat
          );
          const angle = (i / 6) * Math.PI * 2;
          branch.position.y = (2 + Math.random() * 0.5) * scale;
          branch.rotation.z = Math.PI / 3 + Math.random() * 0.3;
          branch.rotation.y = angle;
          group.add(branch);
        }

        group.userData.animationType = 'none';
        break;
    }

    return group;
  }

  // ========================================
  // ROCK GENERATORS
  // ========================================

  function createRock(type, scale) {
    scale = scale || 1;
    const group = new THREE.Group();
    group.name = 'rock_' + type;

    switch(type) {
      case 'boulder':
        const boulderGeo = new THREE.DodecahedronGeometry(1 * scale, 0);
        const boulderMat = new THREE.MeshLambertMaterial({ color: 0x808080 });

        // Randomize vertices for irregular shape
        const vertices = boulderGeo.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
          vertices[i] += (Math.random() - 0.5) * 0.2 * scale;
          vertices[i + 1] += (Math.random() - 0.5) * 0.2 * scale;
          vertices[i + 2] += (Math.random() - 0.5) * 0.2 * scale;
        }
        boulderGeo.attributes.position.needsUpdate = true;
        boulderGeo.computeVertexNormals();

        const boulder = new THREE.Mesh(boulderGeo, boulderMat);
        boulder.position.y = 0.8 * scale;
        group.add(boulder);
        break;

      case 'crystal':
        group.userData.animationType = 'bob';
        group.userData.bobSpeed = 1.5;
        group.userData.bobAmount = 0.2;

        const crystalColors = [0x9966ff, 0x6699ff, 0x00ccff];
        const angles = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];

        for (let i = 0; i < 3; i++) {
          const crystalMat = new THREE.MeshLambertMaterial({
            color: crystalColors[i],
            emissive: crystalColors[i],
            emissiveIntensity: 0.3
          });

          const crystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.4 * scale, 0),
            crystalMat
          );

          crystal.position.x = Math.cos(angles[i]) * 0.3 * scale;
          crystal.position.z = Math.sin(angles[i]) * 0.3 * scale;
          crystal.position.y = (0.8 + i * 0.2) * scale;
          crystal.rotation.y = angles[i];
          crystal.scale.y = 1.5 + Math.random() * 0.5;
          group.add(crystal);
        }
        break;

      case 'ruins':
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0xb8a890 });
        const ruinPieces = [
          { w: 1.5, h: 0.4, d: 0.8, x: 0, y: 0.2, z: 0, rx: 0, ry: 0, rz: 0.1 },
          { w: 1.0, h: 0.5, d: 0.6, x: 0.5, y: 0.5, z: 0.3, rx: 0.2, ry: 0.3, rz: -0.15 },
          { w: 0.8, h: 0.6, d: 0.5, x: -0.4, y: 0.6, z: -0.2, rx: -0.15, ry: -0.2, rz: 0.1 },
          { w: 0.6, h: 0.3, d: 0.4, x: 0.2, y: 1.0, z: -0.4, rx: 0.3, ry: 0.1, rz: 0.2 }
        ];

        ruinPieces.forEach(piece => {
          const stone = new THREE.Mesh(
            new THREE.BoxGeometry(piece.w * scale, piece.h * scale, piece.d * scale),
            stoneMat
          );
          stone.position.set(piece.x * scale, piece.y * scale, piece.z * scale);
          stone.rotation.set(piece.rx, piece.ry, piece.rz);
          group.add(stone);
        });
        break;
    }

    return group;
  }

  // ========================================
  // BUILDING GENERATORS
  // ========================================

  function createBuilding(type, scale) {
    scale = scale || 1;
    const group = new THREE.Group();
    group.name = 'building_' + type;

    switch(type) {
      case 'house':
        const wallMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const doorMat = new THREE.MeshLambertMaterial({ color: 0x4a3020 });
        const windowMat = new THREE.MeshLambertMaterial({
          color: 0xffffaa,
          emissive: 0xffff88,
          emissiveIntensity: 0.5
        });

        // Base
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(3 * scale, 2 * scale, 3 * scale),
          wallMat
        );
        base.position.y = 1 * scale;
        group.add(base);

        // Roof (A-frame)
        const roof1 = new THREE.Mesh(
          new THREE.PlaneGeometry(3.5 * scale, 2 * scale),
          roofMat
        );
        roof1.position.y = 2.5 * scale;
        roof1.position.z = -0.5 * scale;
        roof1.rotation.x = -Math.PI / 4;
        group.add(roof1);

        const roof2 = new THREE.Mesh(
          new THREE.PlaneGeometry(3.5 * scale, 2 * scale),
          roofMat
        );
        roof2.position.y = 2.5 * scale;
        roof2.position.z = 0.5 * scale;
        roof2.rotation.x = Math.PI / 4;
        group.add(roof2);

        // Door
        const door = new THREE.Mesh(
          new THREE.BoxGeometry(0.6 * scale, 1.2 * scale, 0.1 * scale),
          doorMat
        );
        door.position.y = 0.6 * scale;
        door.position.z = 1.55 * scale;
        group.add(door);

        // Windows
        const windowPositions = [
          { x: -0.8, y: 1.2, z: 1.55 },
          { x: 0.8, y: 1.2, z: 1.55 }
        ];
        windowPositions.forEach(pos => {
          const window = new THREE.Mesh(
            new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.1 * scale),
            windowMat
          );
          window.position.set(pos.x * scale, pos.y * scale, pos.z * scale);
          group.add(window);
        });
        break;

      case 'tower':
        const towerMat = new THREE.MeshLambertMaterial({ color: 0x9a9a9a });
        const crenMat = new THREE.MeshLambertMaterial({ color: 0x808080 });

        // Main tower
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(1 * scale, 1.2 * scale, 6 * scale, 12),
          towerMat
        );
        tower.position.y = 3 * scale;
        group.add(tower);

        // Crenellations (battlements)
        for (let i = 0; i < 8; i++) {
          const cren = new THREE.Mesh(
            new THREE.BoxGeometry(0.3 * scale, 0.5 * scale, 0.3 * scale),
            crenMat
          );
          const angle = (i / 8) * Math.PI * 2;
          cren.position.x = Math.cos(angle) * 1 * scale;
          cren.position.z = Math.sin(angle) * 1 * scale;
          cren.position.y = 6.25 * scale;
          group.add(cren);
        }

        // Window slits
        const slitMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const slit = new THREE.Mesh(
            new THREE.BoxGeometry(0.1 * scale, 0.6 * scale, 0.2 * scale),
            slitMat
          );
          slit.position.x = Math.cos(angle) * 1.15 * scale;
          slit.position.z = Math.sin(angle) * 1.15 * scale;
          slit.position.y = 4 * scale;
          group.add(slit);
        }
        break;

      case 'market_stall':
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
        const fabricMat = new THREE.MeshLambertMaterial({ color: 0xff6b35 });
        const counterMat = new THREE.MeshLambertMaterial({ color: 0xa0826d });

        // Four corner poles
        const polePositions = [
          { x: -1, z: -1 }, { x: 1, z: -1 },
          { x: -1, z: 1 }, { x: 1, z: 1 }
        ];
        polePositions.forEach(pos => {
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 2.5 * scale, 6),
            poleMat
          );
          pole.position.set(pos.x * scale, 1.25 * scale, pos.z * scale);
          group.add(pole);
        });

        // Fabric roof
        const roof = new THREE.Mesh(
          new THREE.PlaneGeometry(2.5 * scale, 2.5 * scale),
          fabricMat
        );
        roof.position.y = 2.5 * scale;
        roof.rotation.x = -Math.PI / 2;
        group.add(roof);

        // Counter
        const counter = new THREE.Mesh(
          new THREE.BoxGeometry(2 * scale, 0.1 * scale, 1 * scale),
          counterMat
        );
        counter.position.y = 1 * scale;
        counter.position.z = 0.5 * scale;
        group.add(counter);
        break;

      case 'temple':
        const templeMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc4 });
        const pillarMat = new THREE.MeshLambertMaterial({ color: 0xd4c5a9 });

        // Base platform with steps
        for (let i = 0; i < 3; i++) {
          const step = new THREE.Mesh(
            new THREE.BoxGeometry((4 - i * 0.3) * scale, 0.3 * scale, (3 - i * 0.3) * scale),
            templeMat
          );
          step.position.y = i * 0.3 * scale;
          group.add(step);
        }

        // Main building
        const main = new THREE.Mesh(
          new THREE.BoxGeometry(3 * scale, 2 * scale, 2 * scale),
          templeMat
        );
        main.position.y = 1.9 * scale;
        group.add(main);

        // Six pillars
        const pillarXPos = [-1.2, -0.4, 0.4, 1.2];
        pillarXPos.forEach(x => {
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, 2 * scale, 8),
            pillarMat
          );
          pillar.position.set(x * scale, 1.9 * scale, 1.2 * scale);
          group.add(pillar);
        });

        // Triangular pediment
        const pediment = new THREE.Mesh(
          new THREE.ConeGeometry(1.8 * scale, 0.8 * scale, 3),
          templeMat
        );
        pediment.position.y = 3.3 * scale;
        pediment.position.z = 1.2 * scale;
        pediment.rotation.z = -Math.PI / 2;
        pediment.rotation.y = Math.PI / 2;
        group.add(pediment);
        break;
    }

    return group;
  }

  // ========================================
  // FURNITURE GENERATORS
  // ========================================

  function createFurniture(type) {
    const group = new THREE.Group();
    group.name = 'furniture_' + type;

    switch(type) {
      case 'bench':
        const benchMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

        // Seat
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.1, 0.4),
          benchMat
        );
        seat.position.y = 0.5;
        group.add(seat);

        // Legs
        const leg1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.5, 0.1),
          benchMat
        );
        leg1.position.set(-0.6, 0.25, 0);
        group.add(leg1);

        const leg2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.5, 0.1),
          benchMat
        );
        leg2.position.set(0.6, 0.25, 0);
        group.add(leg2);
        break;

      case 'lantern':
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const lightMat = new THREE.MeshLambertMaterial({
          color: 0xffff88,
          emissive: 0xffff00,
          emissiveIntensity: 0.8
        });

        // Pole
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 2, 6),
          poleMat
        );
        pole.position.y = 1;
        group.add(pole);

        // Glowing lantern box
        const lantern = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.3, 0.3),
          lightMat
        );
        lantern.position.y = 2.2;
        group.add(lantern);

        // Add point light
        const light = new THREE.PointLight(0xffff88, 1, 10);
        light.position.y = 2.2;
        group.add(light);
        break;

      case 'well':
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

        // Stone cylinder
        const wellBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.8, 1, 12),
          stoneMat
        );
        wellBase.position.y = 0.5;
        group.add(wellBase);

        // Wooden frame posts
        const post1 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6),
          woodMat
        );
        post1.position.set(-0.6, 1.25, 0);
        group.add(post1);

        const post2 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6),
          woodMat
        );
        post2.position.set(0.6, 1.25, 0);
        group.add(post2);

        // Crossbar with rope cylinder
        const crossbar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6),
          woodMat
        );
        crossbar.position.y = 2;
        crossbar.rotation.z = Math.PI / 2;
        group.add(crossbar);

        // Bucket
        const bucket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.12, 0.2, 8),
          woodMat
        );
        bucket.position.set(0, 1.5, 0.5);
        group.add(bucket);
        break;

      case 'bridge':
        const plankMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
        const railMat = new THREE.MeshLambertMaterial({ color: 0x654321 });

        // Arched planks
        const numPlanks = 8;
        for (let i = 0; i < numPlanks; i++) {
          const plank = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.1, 0.4),
            plankMat
          );
          const t = (i / (numPlanks - 1)) * Math.PI;
          plank.position.x = (i - numPlanks / 2) * 0.5;
          plank.position.y = Math.sin(t) * 0.3;
          plank.rotation.z = Math.cos(t) * 0.2;
          group.add(plank);
        }

        // Side rails
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < numPlanks; i++) {
            const rail = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4),
              railMat
            );
            const t = (i / (numPlanks - 1)) * Math.PI;
            rail.position.x = (i - numPlanks / 2) * 0.5;
            rail.position.y = Math.sin(t) * 0.3 + 0.25;
            rail.position.z = side * 0.35;
            group.add(rail);
          }
        }
        break;

      case 'fence':
        const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

        // Vertical posts
        for (let i = 0; i < 5; i++) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 1, 0.1),
            fenceMat
          );
          post.position.x = (i - 2) * 0.5;
          post.position.y = 0.5;
          group.add(post);
        }

        // Horizontal rails
        for (let i = 0; i < 2; i++) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.08, 0.08),
            fenceMat
          );
          rail.position.y = 0.3 + i * 0.4;
          group.add(rail);
        }
        break;
    }

    return group;
  }

  // ========================================
  // CREATURE GENERATORS
  // ========================================

  function createCreature(type) {
    const group = new THREE.Group();
    group.name = 'creature_' + type;

    switch(type) {
      case 'butterfly':
        group.userData.animationType = 'flap';
        group.userData.flapSpeed = 8;
        group.userData.flapAmount = Math.PI / 4;

        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const wingMat = new THREE.MeshLambertMaterial({ color: 0xff6b9d });

        // Body
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6),
          bodyMat
        );
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Wings (will rotate for flapping)
        const leftWing = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 0.4),
          wingMat
        );
        leftWing.position.z = 0.2;
        leftWing.name = 'leftWing';
        group.add(leftWing);

        const rightWing = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 0.4),
          wingMat
        );
        rightWing.position.z = -0.2;
        rightWing.name = 'rightWing';
        group.add(rightWing);
        break;

      case 'bird':
        group.userData.animationType = 'bob';
        group.userData.bobSpeed = 2;
        group.userData.bobAmount = 0.3;

        const birdBodyMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const birdWingMat = new THREE.MeshLambertMaterial({ color: 0x654321 });

        // Body (cone)
        const birdBody = new THREE.Mesh(
          new THREE.ConeGeometry(0.15, 0.4, 8),
          birdBodyMat
        );
        birdBody.rotation.z = -Math.PI / 2;
        group.add(birdBody);

        // Wings
        const leftBirdWing = new THREE.Mesh(
          new THREE.PlaneGeometry(0.4, 0.2),
          birdWingMat
        );
        leftBirdWing.position.z = 0.15;
        leftBirdWing.rotation.x = Math.PI / 6;
        leftBirdWing.name = 'leftWing';
        group.add(leftBirdWing);

        const rightBirdWing = new THREE.Mesh(
          new THREE.PlaneGeometry(0.4, 0.2),
          birdWingMat
        );
        rightBirdWing.position.z = -0.15;
        rightBirdWing.rotation.x = -Math.PI / 6;
        rightBirdWing.name = 'rightWing';
        group.add(rightBirdWing);
        break;

      case 'fish':
        group.userData.animationType = 'swim';
        group.userData.swimSpeed = 1;
        group.userData.swimRadius = 2;
        group.userData.swimAngle = 0;

        const fishBodyMat = new THREE.MeshLambertMaterial({ color: 0xff8c00 });
        const fishTailMat = new THREE.MeshLambertMaterial({ color: 0xff6347 });

        // Elongated body
        const fishBody = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 6),
          fishBodyMat
        );
        fishBody.scale.x = 2;
        group.add(fishBody);

        // Triangle tail
        const tailGeo = new THREE.ConeGeometry(0.15, 0.3, 3);
        const tail = new THREE.Mesh(tailGeo, fishTailMat);
        tail.rotation.z = Math.PI / 2;
        tail.position.x = -0.4;
        group.add(tail);
        break;
    }

    return group;
  }

  // ========================================
  // ANIMATION SYSTEM
  // ========================================

  function animateModel(model, deltaTime, worldTime) {
    if (!model.userData.animationType || model.userData.animationType === 'none') {
      return;
    }

    const type = model.userData.animationType;

    switch(type) {
      case 'sway':
        // Gentle tree sway
        const swayAmount = model.userData.swayAmount || 0.05;
        const swaySpeed = model.userData.swaySpeed || 1.0;
        model.rotation.z = Math.sin(worldTime * swaySpeed) * swayAmount;
        model.rotation.x = Math.cos(worldTime * swaySpeed * 0.7) * swayAmount * 0.5;
        break;

      case 'flap':
        // Wing flapping for butterflies/birds
        const flapSpeed = model.userData.flapSpeed || 8;
        const flapAmount = model.userData.flapAmount || Math.PI / 4;
        const flapAngle = Math.sin(worldTime * flapSpeed) * flapAmount;

        const leftWing = model.getObjectByName('leftWing');
        const rightWing = model.getObjectByName('rightWing');

        if (leftWing) {
          leftWing.rotation.y = flapAngle;
        }
        if (rightWing) {
          rightWing.rotation.y = -flapAngle;
        }
        break;

      case 'swim':
        // Circular swimming motion
        const swimSpeed = model.userData.swimSpeed || 1;
        const swimRadius = model.userData.swimRadius || 2;

        model.userData.swimAngle = (model.userData.swimAngle || 0) + deltaTime * swimSpeed;

        const centerX = model.userData.swimCenterX || 0;
        const centerZ = model.userData.swimCenterZ || 0;

        model.position.x = centerX + Math.cos(model.userData.swimAngle) * swimRadius;
        model.position.z = centerZ + Math.sin(model.userData.swimAngle) * swimRadius;
        model.rotation.y = model.userData.swimAngle + Math.PI / 2;
        break;

      case 'bob':
        // Vertical bobbing motion
        const bobSpeed = model.userData.bobSpeed || 1.5;
        const bobAmount = model.userData.bobAmount || 0.2;
        const baseY = model.userData.baseY || model.position.y;

        if (model.userData.baseY === undefined) {
          model.userData.baseY = model.position.y;
        }

        model.position.y = baseY + Math.sin(worldTime * bobSpeed) * bobAmount;
        break;

      case 'spin':
        // Slow rotation around Y axis
        const spinSpeed = model.userData.spinSpeed || 0.5;
        model.rotation.y += deltaTime * spinSpeed;
        break;
    }
  }

  // ========================================
  // EXPORTS
  // ========================================

  exports.createTree = createTree;
  exports.createRock = createRock;
  exports.createBuilding = createBuilding;
  exports.createFurniture = createFurniture;
  exports.createCreature = createCreature;
  exports.animateModel = animateModel;

})(typeof module !== 'undefined' ? module.exports : (window.Models = {}));
