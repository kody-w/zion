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
  // LANDMARK GENERATORS
  // ========================================

  function createLandmark(type, scale) {
    scale = scale || 1;
    const group = new THREE.Group();
    group.name = 'landmark_' + type;

    switch(type) {
      case 'fountain':
        const basinMat = new THREE.MeshLambertMaterial({ color: 0x8899aa });
        const waterMat = new THREE.MeshLambertMaterial({
          color: 0x4488cc,
          transparent: true,
          opacity: 0.7
        });
        const pillarMat = new THREE.MeshLambertMaterial({ color: 0xaabbcc });

        // Circular basin
        const basin = new THREE.Mesh(
          new THREE.CylinderGeometry(2 * scale, 2.2 * scale, 0.6 * scale, 16),
          basinMat
        );
        basin.position.y = 0.3 * scale;
        group.add(basin);

        // Water surface inside basin
        const water = new THREE.Mesh(
          new THREE.CylinderGeometry(1.8 * scale, 1.8 * scale, 0.1 * scale, 16),
          waterMat
        );
        water.position.y = 0.5 * scale;
        group.add(water);

        // Central pillar
        const centerPillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 2 * scale, 8),
          pillarMat
        );
        centerPillar.position.y = 1.3 * scale;
        group.add(centerPillar);

        // Top bowl
        const topBowl = new THREE.Mesh(
          new THREE.SphereGeometry(0.5 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
          basinMat
        );
        topBowl.position.y = 2.3 * scale;
        topBowl.rotation.x = Math.PI;
        group.add(topBowl);

        // Water drop effect (small glowing sphere)
        const dropMat = new THREE.MeshLambertMaterial({
          color: 0x88ccff,
          emissive: 0x2266aa,
          emissiveIntensity: 0.4
        });
        const drop = new THREE.Mesh(
          new THREE.SphereGeometry(0.15 * scale, 8, 6),
          dropMat
        );
        drop.position.y = 2.5 * scale;
        drop.name = 'waterDrop';
        group.add(drop);

        group.userData.animationType = 'fountain';
        break;

      case 'obelisk':
        const obeliskMat = new THREE.MeshLambertMaterial({ color: 0x334455 });
        const runeMat = new THREE.MeshLambertMaterial({
          color: 0x88aaff,
          emissive: 0x4466cc,
          emissiveIntensity: 0.6
        });

        // Tall tapered column
        const obelisk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3 * scale, 0.6 * scale, 5 * scale, 4),
          obeliskMat
        );
        obelisk.position.y = 2.5 * scale;
        group.add(obelisk);

        // Glowing rune rings
        for (let i = 0; i < 3; i++) {
          const rune = new THREE.Mesh(
            new THREE.TorusGeometry(0.45 * scale, 0.04 * scale, 6, 12),
            runeMat
          );
          rune.position.y = (1.5 + i * 1.2) * scale;
          rune.rotation.x = Math.PI / 2;
          group.add(rune);
        }

        // Pyramidal top
        const top = new THREE.Mesh(
          new THREE.ConeGeometry(0.35 * scale, 0.6 * scale, 4),
          obeliskMat
        );
        top.position.y = 5.3 * scale;
        group.add(top);

        // Glowing tip
        const tipMat = new THREE.MeshLambertMaterial({
          color: 0xaaccff,
          emissive: 0x6688ff,
          emissiveIntensity: 1.0
        });
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.12 * scale, 8, 6),
          tipMat
        );
        tip.position.y = 5.7 * scale;
        group.add(tip);

        group.userData.animationType = 'pulse';
        group.userData.pulseSpeed = 1.5;
        break;

      case 'statue':
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
        const pedestalMat = new THREE.MeshLambertMaterial({ color: 0x777777 });

        // Pedestal
        const pedestal = new THREE.Mesh(
          new THREE.BoxGeometry(1.2 * scale, 0.8 * scale, 1.2 * scale),
          pedestalMat
        );
        pedestal.position.y = 0.4 * scale;
        group.add(pedestal);

        // Body (torso)
        const torso = new THREE.Mesh(
          new THREE.BoxGeometry(0.7 * scale, 1.2 * scale, 0.4 * scale),
          stoneMat
        );
        torso.position.y = 1.8 * scale;
        group.add(torso);

        // Head
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.25 * scale, 8, 6),
          stoneMat
        );
        head.position.y = 2.7 * scale;
        group.add(head);

        // Arms reaching out
        const leftArm = new THREE.Mesh(
          new THREE.BoxGeometry(0.8 * scale, 0.2 * scale, 0.2 * scale),
          stoneMat
        );
        leftArm.position.set(-0.7 * scale, 2.0 * scale, 0);
        leftArm.rotation.z = Math.PI / 6;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(
          new THREE.BoxGeometry(0.8 * scale, 0.2 * scale, 0.2 * scale),
          stoneMat
        );
        rightArm.position.set(0.7 * scale, 2.0 * scale, 0);
        rightArm.rotation.z = -Math.PI / 6;
        group.add(rightArm);
        break;

      case 'campfire':
        const logMat = new THREE.MeshLambertMaterial({ color: 0x4a3020 });
        const fireMat = new THREE.MeshLambertMaterial({
          color: 0xff6600,
          emissive: 0xff4400,
          emissiveIntensity: 0.9
        });
        const emberMat = new THREE.MeshLambertMaterial({
          color: 0xff2200,
          emissive: 0xff0000,
          emissiveIntensity: 0.7
        });

        // Ring of stones
        for (let i = 0; i < 8; i++) {
          const stone = new THREE.Mesh(
            new THREE.SphereGeometry(0.15 * scale, 6, 4),
            new THREE.MeshLambertMaterial({ color: 0x666666 })
          );
          const angle = (i / 8) * Math.PI * 2;
          stone.position.x = Math.cos(angle) * 0.6 * scale;
          stone.position.z = Math.sin(angle) * 0.6 * scale;
          stone.position.y = 0.1 * scale;
          stone.scale.y = 0.7;
          group.add(stone);
        }

        // Logs in triangle pattern
        for (let i = 0; i < 3; i++) {
          const log = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 1 * scale, 6),
            logMat
          );
          const angle = (i / 3) * Math.PI * 2;
          log.position.x = Math.cos(angle) * 0.2 * scale;
          log.position.z = Math.sin(angle) * 0.2 * scale;
          log.position.y = 0.15 * scale;
          log.rotation.z = Math.PI / 2;
          log.rotation.y = angle;
          group.add(log);
        }

        // Fire core (will be animated)
        const fireCore = new THREE.Mesh(
          new THREE.ConeGeometry(0.25 * scale, 0.8 * scale, 6),
          fireMat
        );
        fireCore.position.y = 0.5 * scale;
        fireCore.name = 'fireCore';
        group.add(fireCore);

        // Inner flame
        const innerFlame = new THREE.Mesh(
          new THREE.ConeGeometry(0.15 * scale, 0.5 * scale, 5),
          new THREE.MeshLambertMaterial({
            color: 0xffaa00,
            emissive: 0xff8800,
            emissiveIntensity: 1.0
          })
        );
        innerFlame.position.y = 0.55 * scale;
        innerFlame.name = 'innerFlame';
        group.add(innerFlame);

        // Embers
        for (let i = 0; i < 5; i++) {
          const ember = new THREE.Mesh(
            new THREE.SphereGeometry(0.04 * scale, 4, 4),
            emberMat
          );
          ember.position.x = (Math.random() - 0.5) * 0.4 * scale;
          ember.position.z = (Math.random() - 0.5) * 0.4 * scale;
          ember.position.y = 0.2 * scale;
          group.add(ember);
        }

        // Point light for fire glow
        const fireLight = new THREE.PointLight(0xff6622, 2, 15);
        fireLight.position.y = 0.8 * scale;
        group.add(fireLight);

        group.userData.animationType = 'flicker';
        group.userData.flickerSpeed = 8;
        break;

      case 'portal_ring':
        const ringMat = new THREE.MeshLambertMaterial({
          color: 0x8866ff,
          emissive: 0x4422cc,
          emissiveIntensity: 0.8
        });
        const frameMat = new THREE.MeshLambertMaterial({ color: 0x555555 });

        // Stone frame pillars
        const leftPillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.4 * scale, 4 * scale, 0.4 * scale),
          frameMat
        );
        leftPillar.position.set(-1.5 * scale, 2 * scale, 0);
        group.add(leftPillar);

        const rightPillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.4 * scale, 4 * scale, 0.4 * scale),
          frameMat
        );
        rightPillar.position.set(1.5 * scale, 2 * scale, 0);
        group.add(rightPillar);

        // Arch top
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(1.5 * scale, 0.2 * scale, 8, 12, Math.PI),
          frameMat
        );
        arch.position.y = 4 * scale;
        group.add(arch);

        // Glowing inner ring
        const innerRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.2 * scale, 0.08 * scale, 8, 24),
          ringMat
        );
        innerRing.position.y = 2.5 * scale;
        innerRing.name = 'portalRing';
        group.add(innerRing);

        // Swirling energy center (flat disc)
        const portalCenter = new THREE.Mesh(
          new THREE.CircleGeometry(1.1 * scale, 16),
          new THREE.MeshLambertMaterial({
            color: 0xaa88ff,
            emissive: 0x6644cc,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
          })
        );
        portalCenter.position.y = 2.5 * scale;
        portalCenter.name = 'portalCenter';
        group.add(portalCenter);

        group.userData.animationType = 'portal';
        group.userData.spinSpeed = 0.5;
        break;

      case 'signpost':
        const postMat = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
        const signMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

        // Post
        const signPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 2.5 * scale, 6),
          postMat
        );
        signPost.position.y = 1.25 * scale;
        group.add(signPost);

        // Directional signs (angled boards)
        const signAngles = [0, Math.PI / 3, -Math.PI / 4];
        const signColors = [0x9b7924, 0x8b6914, 0x7b5904];
        signAngles.forEach(function(angle, i) {
          var signBoard = new THREE.Mesh(
            new THREE.BoxGeometry(0.8 * scale, 0.2 * scale, 0.05 * scale),
            new THREE.MeshLambertMaterial({ color: signColors[i] })
          );
          signBoard.position.y = (2.0 - i * 0.35) * scale;
          signBoard.position.x = 0.3 * scale;
          signBoard.rotation.y = angle;
          group.add(signBoard);
        });
        break;

      case 'gazebo':
        const gazeboWoodMat = new THREE.MeshLambertMaterial({ color: 0xc9a96e });
        const gazeboRoofMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });

        // Floor platform
        const floor = new THREE.Mesh(
          new THREE.CylinderGeometry(2.5 * scale, 2.5 * scale, 0.2 * scale, 8),
          gazeboWoodMat
        );
        floor.position.y = 0.3 * scale;
        group.add(floor);

        // 6 pillars
        for (let i = 0; i < 6; i++) {
          const gazeboPillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 2.5 * scale, 6),
            gazeboWoodMat
          );
          const pAngle = (i / 6) * Math.PI * 2;
          gazeboPillar.position.x = Math.cos(pAngle) * 2.2 * scale;
          gazeboPillar.position.z = Math.sin(pAngle) * 2.2 * scale;
          gazeboPillar.position.y = 1.55 * scale;
          group.add(gazeboPillar);
        }

        // Conical roof
        const gazeboRoof = new THREE.Mesh(
          new THREE.ConeGeometry(3 * scale, 1.5 * scale, 8),
          gazeboRoofMat
        );
        gazeboRoof.position.y = 3.6 * scale;
        group.add(gazeboRoof);

        // Railing sections between pillars
        for (let i = 0; i < 6; i++) {
          if (i === 0) continue; // Leave one gap for entrance
          const a1 = (i / 6) * Math.PI * 2;
          const a2 = ((i + 1) / 6) * Math.PI * 2;
          const midAngle = (a1 + a2) / 2;
          const railing = new THREE.Mesh(
            new THREE.BoxGeometry(1.5 * scale, 0.1 * scale, 0.08 * scale),
            gazeboWoodMat
          );
          railing.position.x = Math.cos(midAngle) * 2.2 * scale;
          railing.position.z = Math.sin(midAngle) * 2.2 * scale;
          railing.position.y = 0.8 * scale;
          railing.rotation.y = midAngle + Math.PI / 2;
          group.add(railing);
        }
        break;
    }

    return group;
  }

  // ========================================
  // RESOURCE NODE GENERATORS
  // ========================================

  function createResourceNode(type, scale) {
    scale = scale || 1;
    const group = new THREE.Group();
    group.name = 'resource_' + type;
    group.userData.isResource = true;
    group.userData.resourceType = type;

    switch(type) {
      case 'ore_vein':
        const oreMat = new THREE.MeshLambertMaterial({ color: 0x8a7b6b });
        const oreGlintMat = new THREE.MeshLambertMaterial({
          color: 0xccaa66,
          emissive: 0x886622,
          emissiveIntensity: 0.4
        });

        // Base rock
        const oreRock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.7 * scale, 0),
          oreMat
        );
        oreRock.position.y = 0.4 * scale;
        oreRock.scale.y = 0.6;
        group.add(oreRock);

        // Metallic veins (small shiny patches)
        for (let i = 0; i < 4; i++) {
          const vein = new THREE.Mesh(
            new THREE.SphereGeometry(0.12 * scale, 6, 4),
            oreGlintMat
          );
          const angle = (i / 4) * Math.PI * 2 + Math.random();
          vein.position.x = Math.cos(angle) * 0.4 * scale;
          vein.position.z = Math.sin(angle) * 0.4 * scale;
          vein.position.y = (0.3 + Math.random() * 0.3) * scale;
          group.add(vein);
        }

        group.userData.animationType = 'pulse';
        group.userData.pulseSpeed = 0.8;
        break;

      case 'crystal_cluster':
        const crystalColors = [0x88aaff, 0xaa88ff, 0x66ccff, 0xcc88ff];

        // Several upward-pointing crystals
        for (let i = 0; i < 5; i++) {
          const crystalHeight = (0.5 + Math.random() * 1.0) * scale;
          const crystalRadius = (0.08 + Math.random() * 0.12) * scale;
          const crystal = new THREE.Mesh(
            new THREE.ConeGeometry(crystalRadius, crystalHeight, 6),
            new THREE.MeshLambertMaterial({
              color: crystalColors[i % crystalColors.length],
              emissive: crystalColors[i % crystalColors.length],
              emissiveIntensity: 0.3,
              transparent: true,
              opacity: 0.85
            })
          );
          const angle = (i / 5) * Math.PI * 2;
          const rad = 0.2 * scale;
          crystal.position.x = Math.cos(angle) * rad;
          crystal.position.z = Math.sin(angle) * rad;
          crystal.position.y = crystalHeight / 2;
          // Slight random tilt
          crystal.rotation.x = (Math.random() - 0.5) * 0.3;
          crystal.rotation.z = (Math.random() - 0.5) * 0.3;
          group.add(crystal);
        }

        // Glow light
        const crystalLight = new THREE.PointLight(0x8888ff, 0.8, 8);
        crystalLight.position.y = 0.5 * scale;
        group.add(crystalLight);

        group.userData.animationType = 'pulse';
        group.userData.pulseSpeed = 1.2;
        break;

      case 'herb_patch':
        const stemMat = new THREE.MeshLambertMaterial({ color: 0x2d7a2d });
        const flowerColors = [0xff88aa, 0xffaa44, 0xaa88ff, 0x88ffaa];

        // Cluster of small herb plants
        for (let i = 0; i < 6; i++) {
          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.4 * scale, 4),
            stemMat
          );
          const angle = (i / 6) * Math.PI * 2;
          const rad = 0.3 * scale;
          stem.position.x = Math.cos(angle) * rad;
          stem.position.z = Math.sin(angle) * rad;
          stem.position.y = 0.2 * scale;
          group.add(stem);

          // Tiny flower/leaf at top
          const flower = new THREE.Mesh(
            new THREE.SphereGeometry(0.06 * scale, 6, 4),
            new THREE.MeshLambertMaterial({ color: flowerColors[i % flowerColors.length] })
          );
          flower.position.x = stem.position.x;
          flower.position.z = stem.position.z;
          flower.position.y = 0.42 * scale;
          group.add(flower);
        }

        // Ground cover leaves
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x3a8a3a });
        const leafGround = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5 * scale, 0.5 * scale, 0.05 * scale, 8),
          leafMat
        );
        leafGround.position.y = 0.02 * scale;
        group.add(leafGround);

        group.userData.animationType = 'sway';
        group.userData.swayAmount = 0.03;
        group.userData.swaySpeed = 1.5;
        break;

      case 'flower_bed':
        const fStemMat = new THREE.MeshLambertMaterial({ color: 0x2d7a2d });
        const petalColors = [0xff4488, 0xff88cc, 0xffaa66, 0xffff44, 0xff6644];

        // Flowers in a cluster
        for (let i = 0; i < 8; i++) {
          const fStem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015 * scale, 0.02 * scale, 0.5 * scale, 4),
            fStemMat
          );
          const angle = Math.random() * Math.PI * 2;
          const rad = Math.random() * 0.5 * scale;
          fStem.position.x = Math.cos(angle) * rad;
          fStem.position.z = Math.sin(angle) * rad;
          fStem.position.y = 0.25 * scale;
          // Slight random lean
          fStem.rotation.x = (Math.random() - 0.5) * 0.15;
          fStem.rotation.z = (Math.random() - 0.5) * 0.15;
          group.add(fStem);

          // Flower head (small sphere cluster)
          const flowerHead = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 * scale, 6, 4),
            new THREE.MeshLambertMaterial({
              color: petalColors[Math.floor(Math.random() * petalColors.length)]
            })
          );
          flowerHead.position.set(fStem.position.x, 0.52 * scale, fStem.position.z);
          group.add(flowerHead);
        }

        group.userData.animationType = 'sway';
        group.userData.swayAmount = 0.02;
        group.userData.swaySpeed = 2;
        break;

      case 'wood_pile':
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
        const barkMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });

        // Stack of logs
        var logCount = 0;
        for (let row = 0; row < 3; row++) {
          var logsInRow = 3 - row;
          for (let i = 0; i < logsInRow; i++) {
            const log = new THREE.Mesh(
              new THREE.CylinderGeometry(0.12 * scale, 0.12 * scale, 1.0 * scale, 6),
              row % 2 === 0 ? woodMat : barkMat
            );
            log.rotation.z = Math.PI / 2;
            log.position.x = (i - (logsInRow - 1) / 2) * 0.26 * scale;
            log.position.y = (0.12 + row * 0.22) * scale;
            log.position.z = ((logCount % 2) * 0.05 - 0.025) * scale;
            group.add(log);
            logCount++;
          }
        }
        break;
    }

    return group;
  }

  // ========================================
  // MORE CREATURE GENERATORS
  // ========================================

  function createWildlife(type) {
    const group = new THREE.Group();
    group.name = 'wildlife_' + type;

    switch(type) {
      case 'deer':
        const deerBodyMat = new THREE.MeshLambertMaterial({ color: 0xb8860b });
        const deerLegMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

        // Body
        const deerBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.35, 0.8),
          deerBodyMat
        );
        deerBody.position.y = 0.7;
        group.add(deerBody);

        // Head
        const deerHead = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.2, 0.25),
          deerBodyMat
        );
        deerHead.position.set(0, 0.95, 0.4);
        group.add(deerHead);

        // Antlers
        const antlerMat = new THREE.MeshLambertMaterial({ color: 0xd2b48c });
        for (let side = -1; side <= 1; side += 2) {
          const antler = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4),
            antlerMat
          );
          antler.position.set(side * 0.1, 1.15, 0.4);
          antler.rotation.z = side * Math.PI / 6;
          group.add(antler);

          // Antler branch
          const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.15, 4),
            antlerMat
          );
          branch.position.set(side * 0.2, 1.25, 0.4);
          branch.rotation.z = side * Math.PI / 4;
          group.add(branch);
        }

        // Legs
        var legPositions = [
          { x: -0.12, z: 0.25 }, { x: 0.12, z: 0.25 },
          { x: -0.12, z: -0.25 }, { x: 0.12, z: -0.25 }
        ];
        legPositions.forEach(function(pos) {
          var leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.03, 0.5, 6),
            deerLegMat
          );
          leg.position.set(pos.x, 0.3, pos.z);
          group.add(leg);
        });

        // Tail (small white triangle)
        const tailMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const deerTail = new THREE.Mesh(
          new THREE.ConeGeometry(0.05, 0.1, 4),
          tailMat
        );
        deerTail.position.set(0, 0.75, -0.45);
        deerTail.rotation.x = -Math.PI / 4;
        group.add(deerTail);

        group.userData.animationType = 'idle_look';
        group.scale.set(1.5, 1.5, 1.5);
        break;

      case 'rabbit':
        const rabbitMat = new THREE.MeshLambertMaterial({ color: 0xd2b48c });

        // Body
        const rabbitBody = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 8, 6),
          rabbitMat
        );
        rabbitBody.position.y = 0.2;
        rabbitBody.scale.z = 1.3;
        group.add(rabbitBody);

        // Head
        const rabbitHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 6),
          rabbitMat
        );
        rabbitHead.position.set(0, 0.3, 0.15);
        group.add(rabbitHead);

        // Ears
        const earMat = new THREE.MeshLambertMaterial({ color: 0xc4a882 });
        for (let side = -1; side <= 1; side += 2) {
          const ear = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.15, 0.05),
            earMat
          );
          ear.position.set(side * 0.05, 0.45, 0.15);
          ear.rotation.z = side * 0.2;
          group.add(ear);
        }

        // Fluffy tail
        const puffTail = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 4),
          new THREE.MeshLambertMaterial({ color: 0xeeeeee })
        );
        puffTail.position.set(0, 0.2, -0.2);
        group.add(puffTail);

        group.userData.animationType = 'hop';
        group.userData.hopInterval = 3;
        group.userData.hopTimer = Math.random() * 3;
        break;

      case 'firefly':
        const ffBodyMat = new THREE.MeshLambertMaterial({ color: 0x333300 });
        const ffGlowMat = new THREE.MeshLambertMaterial({
          color: 0xffff44,
          emissive: 0xaacc00,
          emissiveIntensity: 1.0
        });

        // Tiny body
        const ffBody = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 6, 4),
          ffBodyMat
        );
        group.add(ffBody);

        // Glowing abdomen
        const ffGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 6, 4),
          ffGlowMat
        );
        ffGlow.position.z = -0.04;
        ffGlow.name = 'glow';
        group.add(ffGlow);

        // Tiny point light
        const ffLight = new THREE.PointLight(0xaacc00, 0.5, 4);
        ffLight.position.z = -0.04;
        group.add(ffLight);

        group.userData.animationType = 'float';
        group.userData.floatSpeed = 0.5 + Math.random() * 0.5;
        group.userData.floatRadius = 1 + Math.random() * 2;
        group.userData.floatAngle = Math.random() * Math.PI * 2;
        group.userData.floatHeight = 1.5 + Math.random();
        break;

      case 'frog':
        const frogMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
        const frogEyeMat = new THREE.MeshLambertMaterial({ color: 0xffff00 });

        // Body
        const frogBody = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 6),
          frogMat
        );
        frogBody.position.y = 0.1;
        frogBody.scale.y = 0.7;
        frogBody.scale.z = 1.2;
        group.add(frogBody);

        // Eyes (protruding)
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 6, 4),
            frogEyeMat
          );
          eye.position.set(side * 0.06, 0.18, 0.08);
          group.add(eye);
        }

        // Back legs
        for (let side = -1; side <= 1; side += 2) {
          const backLeg = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.04, 0.15),
            frogMat
          );
          backLeg.position.set(side * 0.1, 0.05, -0.12);
          group.add(backLeg);
        }

        group.userData.animationType = 'hop';
        group.userData.hopInterval = 5;
        group.userData.hopTimer = Math.random() * 5;
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

      case 'pulse':
        // Pulsating glow (scale throb)
        var pulseSpeed = model.userData.pulseSpeed || 1.5;
        var pulseVal = 1 + Math.sin(worldTime * pulseSpeed) * 0.08;
        model.scale.set(pulseVal, pulseVal, pulseVal);
        break;

      case 'flicker':
        // Fire flicker animation
        var flickerSpeed = model.userData.flickerSpeed || 8;
        var fireCore = model.getObjectByName('fireCore');
        var innerFlame = model.getObjectByName('innerFlame');
        if (fireCore) {
          fireCore.scale.x = 0.8 + Math.sin(worldTime * flickerSpeed) * 0.3;
          fireCore.scale.z = 0.8 + Math.cos(worldTime * flickerSpeed * 1.3) * 0.3;
          fireCore.scale.y = 0.9 + Math.sin(worldTime * flickerSpeed * 0.7) * 0.2;
          fireCore.position.y = 0.5 + Math.sin(worldTime * flickerSpeed * 1.1) * 0.05;
        }
        if (innerFlame) {
          innerFlame.scale.x = 0.7 + Math.cos(worldTime * flickerSpeed * 1.5) * 0.4;
          innerFlame.scale.z = 0.7 + Math.sin(worldTime * flickerSpeed * 0.9) * 0.4;
          innerFlame.rotation.y += deltaTime * 2;
        }
        break;

      case 'fountain':
        // Water drop bouncing animation
        var waterDrop = model.getObjectByName('waterDrop');
        if (waterDrop) {
          var fountainCycle = worldTime * 2;
          var dropPhase = fountainCycle % 2;
          if (dropPhase < 1) {
            waterDrop.position.y = 2.5 + dropPhase * 0.5;
            waterDrop.scale.set(1, 1, 1);
          } else {
            waterDrop.position.y = 3.0 - (dropPhase - 1) * 0.8;
            var shrink = 1 - (dropPhase - 1) * 0.5;
            waterDrop.scale.set(shrink, shrink, shrink);
          }
        }
        break;

      case 'portal':
        // Rotating portal ring + wobbling center
        var portalRing = model.getObjectByName('portalRing');
        var portalCenter = model.getObjectByName('portalCenter');
        if (portalRing) {
          portalRing.rotation.z += deltaTime * 0.5;
        }
        if (portalCenter) {
          portalCenter.rotation.z -= deltaTime * 0.3;
          var opacity = 0.3 + Math.sin(worldTime * 1.5) * 0.2;
          if (portalCenter.material) {
            portalCenter.material.opacity = opacity;
          }
        }
        break;

      case 'float':
        // Floating in a gentle path (for fireflies)
        var floatSpeed = model.userData.floatSpeed || 0.5;
        var floatRadius = model.userData.floatRadius || 2;
        var floatHeight = model.userData.floatHeight || 2;

        model.userData.floatAngle = (model.userData.floatAngle || 0) + deltaTime * floatSpeed;
        var fAngle = model.userData.floatAngle;

        if (model.userData.floatCenterX === undefined) {
          model.userData.floatCenterX = model.position.x;
          model.userData.floatCenterZ = model.position.z;
        }

        model.position.x = model.userData.floatCenterX + Math.cos(fAngle) * floatRadius;
        model.position.z = model.userData.floatCenterZ + Math.sin(fAngle * 0.7) * floatRadius;
        model.position.y = floatHeight + Math.sin(fAngle * 1.3) * 0.5;
        break;

      case 'hop':
        // Occasional hopping for rabbits/frogs
        model.userData.hopTimer = (model.userData.hopTimer || 0) - deltaTime;
        if (model.userData.hopTimer <= 0) {
          model.userData.hopTimer = model.userData.hopInterval || 3;
          model.userData.isHopping = true;
          model.userData.hopPhase = 0;
          // Pick random direction
          model.userData.hopDirX = (Math.random() - 0.5) * 2;
          model.userData.hopDirZ = (Math.random() - 0.5) * 2;
        }
        if (model.userData.isHopping) {
          model.userData.hopPhase += deltaTime * 4;
          if (model.userData.hopPhase < Math.PI) {
            var hopHeight = Math.sin(model.userData.hopPhase) * 0.3;
            if (model.userData.baseHopY === undefined) {
              model.userData.baseHopY = model.position.y;
            }
            model.position.y = model.userData.baseHopY + hopHeight;
            model.position.x += model.userData.hopDirX * deltaTime;
            model.position.z += model.userData.hopDirZ * deltaTime;
          } else {
            model.position.y = model.userData.baseHopY || model.position.y;
            model.userData.isHopping = false;
          }
        }
        break;

      case 'idle_look':
        // Gentle head turning for deer
        model.rotation.y = Math.sin(worldTime * 0.3) * 0.3;
        break;
    }
  }

  // ========================================
  // GROUND COVER — Grass, mushrooms, bushes, fallen logs
  // ========================================

  function createGrassPatch(scale) {
    scale = scale || 1;
    var group = new THREE.Group();
    group.name = 'grass_patch';
    group.userData.animationType = 'sway';
    group.userData.swayAmount = 0.03;
    group.userData.swaySpeed = 2.0;

    var grassColors = [0x4a8028, 0x3a6b1f, 0x5a9030, 0x2d5016, 0x68a840];

    // 8-12 grass blades in a cluster
    var bladeCount = 8 + Math.floor(Math.random() * 5);
    for (var i = 0; i < bladeCount; i++) {
      var bladeHeight = (0.3 + Math.random() * 0.4) * scale;
      var bladeGeo = new THREE.PlaneGeometry(0.04 * scale, bladeHeight);
      var bladeMat = new THREE.MeshLambertMaterial({
        color: grassColors[Math.floor(Math.random() * grassColors.length)],
        side: THREE.DoubleSide
      });
      var blade = new THREE.Mesh(bladeGeo, bladeMat);

      var angle = (i / bladeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      var radius = Math.random() * 0.3 * scale;
      blade.position.x = Math.cos(angle) * radius;
      blade.position.z = Math.sin(angle) * radius;
      blade.position.y = bladeHeight * 0.5;
      blade.rotation.y = Math.random() * Math.PI;
      blade.rotation.z = (Math.random() - 0.5) * 0.3;
      group.add(blade);
    }

    return group;
  }

  function createMushroom(type, scale) {
    scale = scale || 1;
    type = type || 'red';
    var group = new THREE.Group();
    group.name = 'mushroom_' + type;

    var stemMat = new THREE.MeshLambertMaterial({ color: 0xf5deb3 });
    var capColors = {
      red: 0xcc3333,
      brown: 0x8b6914,
      white: 0xf0f0e0,
      purple: 0x9966cc,
      glowing: 0x66ffcc
    };
    var capColor = capColors[type] || capColors.red;

    // Main mushroom
    var stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.2 * scale, 6),
      stemMat
    );
    stem.position.y = 0.1 * scale;
    group.add(stem);

    var capMat = new THREE.MeshLambertMaterial({ color: capColor });
    if (type === 'glowing') {
      capMat = new THREE.MeshBasicMaterial({ color: capColor });
    }
    var cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 * scale, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6),
      capMat
    );
    cap.position.y = 0.2 * scale;
    group.add(cap);

    // Add spots to red/purple mushrooms
    if (type === 'red' || type === 'purple') {
      for (var s = 0; s < 4; s++) {
        var spot = new THREE.Mesh(
          new THREE.CircleGeometry(0.015 * scale, 6),
          new THREE.MeshLambertMaterial({ color: 0xffffff })
        );
        var sAngle = (s / 4) * Math.PI * 2;
        spot.position.x = Math.cos(sAngle) * 0.07 * scale;
        spot.position.z = Math.sin(sAngle) * 0.07 * scale;
        spot.position.y = 0.23 * scale;
        spot.rotation.x = -Math.PI * 0.3;
        spot.rotation.y = sAngle;
        group.add(spot);
      }
    }

    // Add 1-2 smaller mushrooms next to main
    for (var m = 0; m < 1 + Math.floor(Math.random() * 2); m++) {
      var smallScale = 0.5 + Math.random() * 0.3;
      var smallStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * scale * smallScale, 0.04 * scale * smallScale, 0.15 * scale * smallScale, 6),
        stemMat
      );
      var mAngle = Math.random() * Math.PI * 2;
      var mDist = 0.1 + Math.random() * 0.1;
      smallStem.position.x = Math.cos(mAngle) * mDist * scale;
      smallStem.position.z = Math.sin(mAngle) * mDist * scale;
      smallStem.position.y = 0.075 * scale * smallScale;
      group.add(smallStem);

      var smallCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 * scale * smallScale, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.6),
        capMat
      );
      smallCap.position.x = smallStem.position.x;
      smallCap.position.z = smallStem.position.z;
      smallCap.position.y = 0.15 * scale * smallScale;
      group.add(smallCap);
    }

    // Add glow light for glowing mushrooms
    if (type === 'glowing') {
      var glow = new THREE.PointLight(0x66ffcc, 0.5, 3 * scale);
      glow.position.y = 0.2 * scale;
      group.add(glow);
      group.userData.animationType = 'pulse';
    }

    return group;
  }

  function createBush(type, scale) {
    scale = scale || 1;
    type = type || 'green';
    var group = new THREE.Group();
    group.name = 'bush_' + type;
    group.userData.animationType = 'sway';
    group.userData.swayAmount = 0.02;
    group.userData.swaySpeed = 0.8;

    var bushColors = {
      green: [0x2d5016, 0x3a6b1f, 0x4a8028],
      flowering: [0x3a6b1f, 0x4a8028, 0x5a9030],
      berry: [0x2d5016, 0x3a6b1f],
      autumn: [0xcc6600, 0xdd8800, 0xaa4400]
    };

    var colors = bushColors[type] || bushColors.green;

    // 4-6 overlapping spheres for bushy appearance
    var clumpCount = 4 + Math.floor(Math.random() * 3);
    for (var i = 0; i < clumpCount; i++) {
      var clumpSize = (0.25 + Math.random() * 0.2) * scale;
      var clump = new THREE.Mesh(
        new THREE.SphereGeometry(clumpSize, 6, 5),
        new THREE.MeshLambertMaterial({
          color: colors[Math.floor(Math.random() * colors.length)]
        })
      );
      var cAngle = (i / clumpCount) * Math.PI * 2 + Math.random() * 0.5;
      var cRadius = 0.15 * scale;
      clump.position.x = Math.cos(cAngle) * cRadius;
      clump.position.z = Math.sin(cAngle) * cRadius;
      clump.position.y = clumpSize * 0.7;
      group.add(clump);
    }

    // Add flowers to flowering bushes
    if (type === 'flowering') {
      var flowerColors = [0xff6699, 0xffcc00, 0xff9933, 0xcc66ff, 0xff3366];
      for (var f = 0; f < 5 + Math.floor(Math.random() * 4); f++) {
        var flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.04 * scale, 5, 4),
          new THREE.MeshLambertMaterial({
            color: flowerColors[Math.floor(Math.random() * flowerColors.length)]
          })
        );
        var fAngle = Math.random() * Math.PI * 2;
        var fRadius = Math.random() * 0.35 * scale;
        flower.position.x = Math.cos(fAngle) * fRadius;
        flower.position.z = Math.sin(fAngle) * fRadius;
        flower.position.y = 0.3 * scale + Math.random() * 0.15 * scale;
        group.add(flower);
      }
    }

    // Add berries to berry bushes
    if (type === 'berry') {
      for (var b = 0; b < 6 + Math.floor(Math.random() * 5); b++) {
        var berry = new THREE.Mesh(
          new THREE.SphereGeometry(0.025 * scale, 5, 4),
          new THREE.MeshLambertMaterial({ color: 0xcc0033 })
        );
        var bAngle = Math.random() * Math.PI * 2;
        var bRadius = Math.random() * 0.3 * scale;
        berry.position.x = Math.cos(bAngle) * bRadius;
        berry.position.z = Math.sin(bAngle) * bRadius;
        berry.position.y = 0.2 * scale + Math.random() * 0.2 * scale;
        group.add(berry);
      }
    }

    return group;
  }

  function createFallenLog(scale) {
    scale = scale || 1;
    var group = new THREE.Group();
    group.name = 'fallen_log';

    var barkMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
    var innerMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });

    // Main log body (laid on side)
    var log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15 * scale, 0.18 * scale, 2.5 * scale, 8),
      barkMat
    );
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.15 * scale;
    group.add(log);

    // Cross-section ring at one end
    var ring = new THREE.Mesh(
      new THREE.CircleGeometry(0.15 * scale, 8),
      innerMat
    );
    ring.position.x = 1.25 * scale;
    ring.position.y = 0.15 * scale;
    ring.rotation.y = Math.PI / 2;
    group.add(ring);

    // Small moss patches on top
    var mossMat = new THREE.MeshLambertMaterial({ color: 0x4a8028 });
    for (var i = 0; i < 3; i++) {
      var moss = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 * scale, 5, 4, 0, Math.PI * 2, 0, Math.PI * 0.5),
        mossMat
      );
      moss.position.x = (Math.random() - 0.5) * 1.5 * scale;
      moss.position.y = 0.28 * scale;
      moss.position.z = (Math.random() - 0.5) * 0.1 * scale;
      group.add(moss);
    }

    // Optional small mushroom growing on it
    if (Math.random() < 0.5) {
      var logMushroom = createMushroom('brown', scale * 0.4);
      logMushroom.position.x = (Math.random() - 0.5) * scale;
      logMushroom.position.y = 0.3 * scale;
      group.add(logMushroom);
    }

    return group;
  }

  // ========================================
  // EXPORTS
  // ========================================

  exports.createTree = createTree;
  exports.createRock = createRock;
  exports.createBuilding = createBuilding;
  exports.createFurniture = createFurniture;
  exports.createCreature = createCreature;
  exports.createLandmark = createLandmark;
  exports.createResourceNode = createResourceNode;
  exports.createWildlife = createWildlife;
  exports.createGrassPatch = createGrassPatch;
  exports.createMushroom = createMushroom;
  exports.createBush = createBush;
  exports.createFallenLog = createFallenLog;
  exports.animateModel = animateModel;

})(typeof module !== 'undefined' ? module.exports : (window.Models = {}));
