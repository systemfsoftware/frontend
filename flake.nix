{
  description = "starter toolchain — the formatter, runtimes, systemfsoftware packages and dependency sandbox the check chain shells out to";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # The release manifest (`nix/release-hashes.json`) rides in this input, so
    # Dependabot's bump of it is also the version and digest bump.
    comment-checker = {
      url = "github:systemfsoftware/comment-checker";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    # The systemfsoftware pin's own pin: from this commit on,
    # mkPnpmWorkspacePackages takes `files`, which this workspace's tarball
    # build needs for the lockfile's file:.sfs-deps tarballs.
    pnpm-release-management = {
      url = "github:systemfsoftware/pnpm-release-management/8cd6e83009531de040cd9c03e1370b4966fd2a12";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.comment-checker.follows = "comment-checker";
      inputs.importPnpmLock.follows = "importPnpmLock";
    };
    # The generic toolchain at a fixed commit. Its lib.mkConsumerStore builds
    # the sandbox store, and its tarballs are the file:.sfs-deps specs the
    # lockfile names, so a version moves only when this pin moves.
    systemfsoftware = {
      url = "github:systemfsoftware/systemfsoftware/d1ab631935c9439bcd16abf2894b09b843494701";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.comment-checker.follows = "comment-checker";
      inputs.pnpm-release-management.follows = "pnpm-release-management";
    };
    stryker-js-effect = {
      url = "github:systemfsoftware/stryker-js-effect/main";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.comment-checker.follows = "comment-checker";
      inputs.importPnpmLock.follows = "importPnpmLock";
      inputs.pnpm-release-management.follows = "pnpm-release-management";
      inputs.systemfsoftware.follows = "systemfsoftware";
    };
    systemfsoftware-xstate = {
      url = "github:systemfsoftware/xstate/main";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    # The attw CLI every package's `attw` script runs, built from source at
    # the released 4.2.0 tag, so no @systemfsoftware/* package is fetched from
    # a registry. flake = false: the input is the pinned tree.
    are-the-types-wrong-effect = {
      url = "github:systemfsoftware/are-the-types-wrong-effect/d43a8020f7dc82a32de410823c6da5298c53a3b6";
      flake = false;
    };
    # @systemfsoftware/effect-cell-types@v7.0.0's tag commit: the version
    # attw 4.2.0's lockfile resolves. Only the attw install takes it.
    systemfsoftware-effect-cell-types-7 = {
      url = "github:systemfsoftware/systemfsoftware/4cf0f77016f1827fc54ed00144cc85e00eb729a1";
      flake = false;
    };
    # The pnpm store is hashless: each tarball's lockfile integrity is its fetch hash, so a lockfile change needs no hash edit.
    importPnpmLock = {
      url = "github:Scrumplex/importPnpmLock.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, comment-checker, pnpm-release-management, systemfsoftware, stryker-js-effect, systemfsoftware-xstate, are-the-types-wrong-effect, systemfsoftware-effect-cell-types-7, importPnpmLock }:
    let
      lib = nixpkgs.lib;
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forEachSystem = fn: lib.genAttrs systems (system: fn nixpkgs.legacyPackages.${system});

      # The systemfsoftware packages this workspace installs, by flake
      # attribute: every @systemfsoftware/* lockfile entry outside the
      # stryker-js-effect, xstate and attw tarballs.
      sfsPackages = [
        "conformance-spec"
        "differential-spec"
        "effect-cell-types"
        "effect-gherkin-spec"
        "effect-schema-discovery"
        "effect-schema-law"
        "effect-schema-recursion-budget"
        "effect-schema-vite"
        "effect-sim-kernel"
        "effect-spec-runtime"
        "oxlint-config-cell-architecture"
        "oxlint-config-dmmf"
        "oxlint-config-recommended"
        "oxlint-config-rule-authoring"
        "oxlint-plugin-cell-architecture"
        "oxlint-plugin-dmmf-workflow"
        "oxlint-plugin-effect-platform"
        "oxlint-plugin-effect-schema"
        "oxlint-plugin-test-discipline"
        "stryker-config"
        "tsconfig"
        "tsdown-config"
        "vitest"
        "vitest-config"
      ];

      # The tarballs the lockfile names that the systemfsoftware flake does
      # not build: stryker-js-effect's, xstate's, and the attw CLI built from
      # source the way xstate builds it.
      extraDepsOf = pkgs:
        let
          system = pkgs.stdenv.hostPlatform.system;
          sys-tarballs = systemfsoftware.packages.${system}.workspace-tarballs;
          mkPnpmStore = pkgs.callPackage ./nix/pnpm-store.nix {
            inherit (importPnpmLock.legacyPackages.${system}) importPnpmLock;
            nodejs = pkgs.nodejs_24;
            pnpm = pkgs.pnpm_12;
          };
          fromSource = args: pkgs.callPackage ./nix/from-source.nix ({
            inherit mkPnpmStore;
            nodejs = pkgs.nodejs_24;
            pnpm = pkgs.pnpm_12;
          } // args);
          effect-cell-types-7 = fromSource {
            pname = "effect-cell-types";
            src = systemfsoftware-effect-cell-types-7;
            overlay = ./nix/effect-cell-types;
            deps = sys-tarballs;
            packed = [
              { name = "@systemfsoftware/effect-cell-types"; dir = "packages/effect-cell-types"; }
            ];
          };
          # The attw install takes effect-cell-types 7 beside the
          # systemfsoftware set.
          attw-deps = pkgs.runCommand "starter-attw-deps" { } ''
            mkdir -p "$out"
            cp -r ${sys-tarballs}/. "$out"/
            cp -r ${effect-cell-types-7.tarballs}/. "$out"/
          '';
          attw = fromSource {
            pname = "arethetypeswrong-cli";
            src = are-the-types-wrong-effect;
            overlay = ./nix/attw;
            deps = attw-deps;
            # The CLI bundles the engine into dist/main.mjs, so the engine is
            # built but only the CLI is packed.
            built = [
              { name = "@systemfsoftware/arethetypeswrong"; dir = "packages/arethetypeswrong"; }
            ];
            packed = [
              { name = "@systemfsoftware/arethetypeswrong-cli"; dir = "apps/arethetypeswrong-cli"; }
            ];
          };
        in
        pkgs.runCommand "starter-extra-deps" { } ''
          mkdir "$out"
          for dir in ${stryker-js-effect.packages.${system}.workspace-tarballs} ${systemfsoftware-xstate.packages.${system}.workspace-tarballs} ${attw.tarballs}; do
            cp "$dir"/*.tgz "$out"/
          done
        '';

      # Every tarball the lockfile names, as plain files under the names the
      # file:.sfs-deps/<name>-<version>.tgz specs use: the sandbox reads no
      # store path outside its closure, so the dev shell copies this directory.
      sfsDepsOf = pkgs:
        let
          sys = systemfsoftware.packages.${pkgs.stdenv.hostPlatform.system};
        in
        pkgs.runCommand "sfs-deps" { } ''
          mkdir "$out"
          cp ${extraDepsOf pkgs}/*.tgz "$out"/
          ${lib.concatMapStrings (name: ''
            cp ${sys.${name}} "$out/${sys.${name}.name}"
          '') sfsPackages}
        '';

      # The lockfile, the workspace doc, every manifest and the patches
      # patchedDependencies names, with the non-systemfsoftware tarballs at
      # .sfs-deps; lib.mkConsumerStore lays the systemfsoftware ones beside them.
      consumerSrcOf = pkgs:
        let
          manifests = lib.fileset.toSource {
            root = ./.;
            fileset = lib.fileset.unions [
              ./pnpm-lock.yaml
              ./pnpm-workspace.yaml
              ./patches
              (lib.fileset.fileFilter (file: file.name == "package.json") ./.)
            ];
          };
        in
        pkgs.runCommand "starter-consumer-src" { } ''
          cp -r ${manifests} "$out"
          chmod -R u+w "$out"
          mkdir -p "$out/.sfs-deps"
          cp ${extraDepsOf pkgs}/*.tgz "$out/.sfs-deps"/
        '';

      workspaceOf = pkgs:
        removeAttrs (pnpm-release-management.lib.mkPnpmWorkspacePackages {
          inherit pkgs;
          src = self;
          pname = "starter";
          pnpm = pkgs.pnpm_12;
          files.".sfs-deps" = sfsDepsOf pkgs;
        }) [ "pnpm-store" "mitmCache" ];
    in
    {
      # A consumer's sandbox store: its lockfile's registry packages plus the
      # named workspace tarballs, which its package.json depends on as
      # `file:<dir>/<name>-<version>.tgz`.
      lib.mkConsumerStore = { pkgs, src, packages, dir ? ".sfs-deps", lockFile ? src + "/pnpm-lock.yaml" }:
        let
          workspace = workspaceOf pkgs;
          members = workspace.workspace-tarballs.members;
          chosen = map (name:
            lib.findFirst (member: member.attr == name)
              (throw "lib.mkConsumerStore: no public workspace package named ${name}")
              members) packages;
        in
        pnpm-release-management.lib.mkPnpmConsumerStore {
          inherit pkgs src lockFile;
          files.${dir} = pkgs.linkFarm "starter-consumer-tarballs"
            (map (member: { name = member.tarball; path = workspace.${member.attr}; }) chosen);
        };

      packages = forEachSystem (pkgs:
        let
          system = pkgs.stdenv.hostPlatform.system;
          dprint = pkgs.callPackage ./nix/dprint.nix { dprintConfig = ./dprint.json; };
          unwrapped = pkgs.callPackage ./nix/comment-checker.nix {
            hashes = "${comment-checker}/nix/release-hashes.json";
          };
          sandboxed = pkgs.callPackage ./nix/comment-checker-sandbox.nix {
            comment-checker = unwrapped;
          };
          sandbox = pkgs.callPackage "${pnpm-release-management}/nix/sandbox/default.nix" { };
          workspace = workspaceOf pkgs;
          own = {
            inherit dprint sandbox;
            sfs-deps = sfsDepsOf pkgs;
            pnpm-store = systemfsoftware.lib.mkConsumerStore {
              inherit pkgs;
              src = consumerSrcOf pkgs;
              packages = sfsPackages;
            };
            sandbox-proofs = (pkgs.callPackage "${pnpm-release-management}/nix/sandbox/proofs.nix" {
              inherit pkgs sandbox;
              inherit (importPnpmLock.legacyPackages.${system}) iplConfigHook;
            }).sandbox-proofs;
            comment-checker = sandboxed;
            comment-checker-unwrapped = unwrapped;
            default = dprint;
          };
          clashes = builtins.attrNames (builtins.intersectAttrs own workspace);
        in
        assert clashes == [ ] || throw "flake.nix: workspace packages ${lib.concatStringsSep ", " clashes} collide with flake packages";
        workspace // own);

      devShells = forEachSystem (pkgs:
        let
          own = self.packages.${pkgs.stdenv.hostPlatform.system};
          playwrightBrowsers = pkgs.playwright-driver.browsers.override {
            withChromium = false;
            withFirefox = false;
            withWebkit = false;
            withFfmpeg = false;
          };
          # Without a font configuration the sandboxed browser lays text out
          # at zero height, so a visibility assertion on text fails.
          fontsConf = pkgs.makeFontsConf { fontDirectories = [ pkgs.dejavu_fonts ]; };
          # The launcher reads only store paths on PATH, the command and the
          # pnpm store, so a bare --pass-env cannot carry the browsers or the
          # font configuration in. A PATH entry whose closure reaches them
          # makes those store paths readable.
          playwrightBrowsersAnchor = pkgs.writeShellApplication {
            name = "playwright-browsers-anchor";
            runtimeInputs = [ playwrightBrowsers ];
            text = ": ${fontsConf}";
          };
        in {
        default = pkgs.mkShell {
          packages = [
            own.dprint
            own.comment-checker
            own.sandbox
            pnpm-release-management.packages.${pkgs.stdenv.hostPlatform.system}.release-tools
            pkgs.actionlint
            pkgs.nodejs_24
            pkgs.pnpm_12
            pkgs.deno
          ] ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [ playwrightBrowsersAnchor ];
          SANDBOX_PNPM_STORE = own.pnpm-store;
          shellHook = ''
            root="$(git rev-parse --show-toplevel)"
            git config core.hooksPath .husky
            rm -rf "$root/.sfs-deps"
            cp -r --no-preserve=mode ${own.sfs-deps} "$root/.sfs-deps"
          '';
          env = pkgs.lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
            PLAYWRIGHT_BROWSERS_PATH = "${playwrightBrowsers}";
            FONTCONFIG_FILE = "${fontsConf}";
          };
        };
      });
    };
}
